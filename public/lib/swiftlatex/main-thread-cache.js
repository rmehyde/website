// Main thread IndexedDB cache handler for SwiftLaTeX
// Monitors SharedArrayBuffer for requests and fulfills them with IndexedDB data

// Load SBA utilities (only if in worker context)
if (typeof importScripts === 'function') {
    importScripts('sba-cache.js');
}

// Helper to access SBA utilities regardless of context
function getSBACache() {
    if (typeof SBACache !== 'undefined') {
        return SBACache;
    } else if (typeof self !== 'undefined' && self.SBACache) {
        return self.SBACache;
    } else if (typeof window !== 'undefined' && window.SBACache) {
        return window.SBACache;
    }
    throw new Error('SBA utilities not available');
}

// Cache configuration
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DB_NAME = 'SwiftLaTeXCache';
const DB_VERSION = 2; // Increment version to force schema recreation
const STORE_NAME = 'texlive_files';

// Global state
let db = null;
let int32Array = null;
let uint8Array = null;
let isMonitoring = false;
let monitoringInterval = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        console.log('[MAIN-CACHE] Initializing IndexedDB');
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('[MAIN-CACHE] IndexedDB initialization failed:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('[MAIN-CACHE] IndexedDB initialized successfully');
            console.log('[MAIN-CACHE] Available object stores:', Array.from(db.objectStoreNames));
            
            // Verify the store exists
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                console.error(`[MAIN-CACHE] Object store '${STORE_NAME}' not found! Available stores:`, Array.from(db.objectStoreNames));
                reject(new Error(`Object store '${STORE_NAME}' not found`));
                return;
            }
            
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            console.log('[MAIN-CACHE] Database upgrade needed - creating schema');
            const database = event.target.result;
            
            console.log('[MAIN-CACHE] Current object stores:', Array.from(database.objectStoreNames));
            
            // Delete existing store if it exists (for clean upgrade)
            if (database.objectStoreNames.contains(STORE_NAME)) {
                console.log(`[MAIN-CACHE] Deleting existing object store: ${STORE_NAME}`);
                database.deleteObjectStore(STORE_NAME);
            }
            
            // Create the object store
            console.log(`[MAIN-CACHE] Creating object store: ${STORE_NAME}`);
            const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
            
            // Create indexes
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('version', 'version', { unique: false });
            
            console.log('[MAIN-CACHE] Object store created successfully with indexes');
        };
        
        request.onblocked = () => {
            console.warn('[MAIN-CACHE] IndexedDB upgrade blocked by other open connections');
        };
    });
}

/**
 * Store file in IndexedDB cache
 * @param {string} key - Cache key (format/filename)
 * @param {Uint8Array} data - File data
 * @returns {Promise<void>}
 */
async function storeInCache(key, data) {
    if (!db) {
        console.warn('[MAIN-CACHE] Database not initialized, skipping cache store');
        return;
    }
    
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.error(`[MAIN-CACHE] Object store '${STORE_NAME}' not found for store operation`);
        return;
    }
    
    try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const record = {
            key: key,
            data: data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
            size: data.length
        };
        
        await new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        console.log(`[MAIN-CACHE] Stored ${key} in IndexedDB (${data.length} bytes)`);
    } catch (error) {
        console.error(`[MAIN-CACHE] Failed to store ${key}:`, error);
    }
}

/**
 * Retrieve file from IndexedDB cache
 * @param {string} key - Cache key
 * @returns {Promise<Uint8Array|null>}
 */
async function getFromCache(key) {
    if (!db) {
        console.warn('[MAIN-CACHE] Database not initialized, skipping cache lookup');
        return null;
    }
    
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.error(`[MAIN-CACHE] Object store '${STORE_NAME}' not found for get operation`);
        return null;
    }
    
    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const record = await new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (!record) {
            return null;
        }
        
        // Check TTL
        const age = Date.now() - record.timestamp;
        if (age > CACHE_TTL_MS) {
            console.log(`[MAIN-CACHE] Cache entry expired for ${key} (age: ${Math.round(age / 1000 / 60 / 60)}h)`);
            // Clean up expired entry
            store.delete(key);
            return null;
        }
        
        // Check version
        if (record.version !== CACHE_VERSION) {
            console.log(`[MAIN-CACHE] Cache version mismatch for ${key} (stored: ${record.version}, current: ${CACHE_VERSION})`);
            store.delete(key);
            return null;
        }
        
        console.log(`[MAIN-CACHE] Cache hit for ${key} (${record.size} bytes)`);
        return record.data;
        
    } catch (error) {
        console.error(`[MAIN-CACHE] Failed to retrieve ${key}:`, error);
        return null;
    }
}

/**
 * Download file from TeXLive endpoint
 * @param {string} url - Remote URL
 * @returns {Promise<Uint8Array|null>}
 */
async function downloadFile(url) {
    try {
        console.log(`[MAIN-CACHE] Downloading ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`[MAIN-CACHE] File not found: ${url}`);
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        console.log(`[MAIN-CACHE] Downloaded ${url} (${data.length} bytes)`);
        return data;
        
    } catch (error) {
        console.error(`[MAIN-CACHE] Download failed for ${url}:`, error);
        return null;
    }
}

/**
 * Process a single request from the SBA
 * @param {number} slotIndex - Request slot index
 */
async function processRequest(slotIndex) {
    const sbaCache = getSBACache();
    const slotOffset = sbaCache.getSlotOffset(slotIndex);
    const stateOffset = (slotOffset + sbaCache.SLOT_STATE_OFFSET) / 4;
    
    // Mark as processing
    Atomics.store(int32Array, stateOffset, sbaCache.STATE_PROCESSING);
    
    try {
        // Read request data
        const filename = sbaCache.readString(
            slotOffset + sbaCache.SLOT_FILENAME_OFFSET,
            sbaCache.MAX_FILENAME_LENGTH
        );
        const format = Atomics.load(int32Array, (slotOffset + sbaCache.SLOT_FORMAT_OFFSET) / 4);
        const operationId = Atomics.load(int32Array, (slotOffset + sbaCache.SLOT_OPERATION_ID_OFFSET) / 4);
        const engineId = Atomics.load(int32Array, (slotOffset + sbaCache.SLOT_ENGINE_PATH_OFFSET) / 4);
        
        // Convert engine ID back to path
        const enginePath = engineId === 1 ? 'xetex' : engineId === 2 ? 'dvipdfm' : 'pdftex';
        
        console.log(`[MAIN-CACHE] Processing request ${operationId}: ${filename} (format: ${format}, engine: ${enginePath})`);
        
        // format is the subfolder number, filename is the actual filename  
        // Construct the full path: format/filename
        const cacheKey = `${format}/${filename}`;
        
        // Try cache first
        let fileData = await getFromCache(cacheKey);
        
        if (!fileData) {
            // Cache miss - download from TeXLive using correct engine path
            const url = `/lib/${enginePath}/${cacheKey}`;
            fileData = await downloadFile(url);
            
            if (!fileData) {
                // File not found
                console.log(`[MAIN-CACHE] File not found: ${cacheKey}`);
                Atomics.store(int32Array, stateOffset, sbaCache.STATE_ERROR);
                Atomics.notify(int32Array, stateOffset, 1);
                return;
            }
            
            // Store in cache for future use
            await storeInCache(cacheKey, fileData);
        }
        
        // Write result to SBA
        const dataOffset = sbaCache.allocateFileData(fileData.length);
        if (dataOffset === -1) {
            console.error(`[MAIN-CACHE] Not enough SBA space for ${filename} (${fileData.length} bytes)`);
            Atomics.store(int32Array, stateOffset, sbaCache.STATE_ERROR);
            Atomics.notify(int32Array, stateOffset, 1);
            return;
        }
        
        // Copy file data to SBA
        uint8Array.set(fileData, dataOffset);
        
        // Update slot with result info
        Atomics.store(int32Array, (slotOffset + sbaCache.SLOT_RESULT_OFFSET) / 4, dataOffset);
        Atomics.store(int32Array, (slotOffset + sbaCache.SLOT_RESULT_SIZE_OFFSET) / 4, fileData.length);
        
        // Mark as done and notify
        Atomics.store(int32Array, stateOffset, sbaCache.STATE_DONE);
        Atomics.notify(int32Array, stateOffset, 1);
        
        console.log(`[MAIN-CACHE] Completed request ${operationId}: ${filename} (${fileData.length} bytes at offset ${dataOffset})`);
        
    } catch (error) {
        console.error(`[MAIN-CACHE] Error processing slot ${slotIndex}:`, error);
        Atomics.store(int32Array, stateOffset, sbaCache.STATE_ERROR);
        Atomics.notify(int32Array, stateOffset, 1);
    }
}

/**
 * Monitor SBA for new requests
 */
function monitorRequests() {
    if (!int32Array || !uint8Array) return;
    
    const sbaCache = getSBACache();
    
    // Scan all slots for REQUESTED state
    for (let i = 0; i < sbaCache.MAX_CONCURRENT_REQUESTS; i++) {
        const slotOffset = sbaCache.getSlotOffset(i);
        const state = Atomics.load(int32Array, (slotOffset + sbaCache.SLOT_STATE_OFFSET) / 4);
        
        if (state === sbaCache.STATE_REQUESTED) {
            // Process this request
            processRequest(i);
        }
    }
}

/**
 * Start the main thread cache handler
 * @param {SharedArrayBuffer} sba - The shared array buffer
 * @returns {Promise<void>}
 */
async function startCacheHandler(sba) {
    console.log('[MAIN-CACHE] Starting main thread cache handler');
    
    // Initialize IndexedDB
    await initIndexedDB();
    
    // Set up SBA views
    getSBACache().setupSBA(sba);
    int32Array = new Int32Array(sba);
    uint8Array = new Uint8Array(sba);
    
    // Start monitoring for requests
    if (!isMonitoring) {
        isMonitoring = true;
        monitoringInterval = setInterval(monitorRequests, 10); // Check every 10ms
        console.log('[MAIN-CACHE] Started request monitoring');
    }
}

/**
 * Stop the cache handler
 */
function stopCacheHandler() {
    console.log('[MAIN-CACHE] Stopping main thread cache handler');
    
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        isMonitoring = false;
    }
    
    if (db) {
        db.close();
        db = null;
    }
}

// Export for main thread use
const MainThreadCache = {
    startCacheHandler,
    stopCacheHandler
};

if (typeof window !== 'undefined') {
    window.MainThreadCache = MainThreadCache;
}
if (typeof self !== 'undefined') {
    self.MainThreadCache = MainThreadCache;
}
if (typeof global !== 'undefined') {
    global.MainThreadCache = MainThreadCache;
}