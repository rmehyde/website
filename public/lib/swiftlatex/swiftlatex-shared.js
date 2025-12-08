// SwiftLaTeX shared configuration and utilities
// Edit this file to change settings and shared functionality for all engines

// Load SBA cache utilities
importScripts("sba-cache.js");

// Configuration
self.SWIFTLATEX_CONFIG = {
    texlive_endpoint: "/lib/"
};

// Shared cache objects (in-memory layer for fast lookups)
let texlive404_cache = {};
let texlive200_cache = {};
let pk404_cache = {};
let pk200_cache = {};

// SBA integration
let int32Array = null;
let uint8Array = null;
let sbaInitialized = false;

// Initialize SBA integration for this worker
function initSBAIntegration(sharedBuffer) {
    if (sbaInitialized) return;
    
    SBACache.setupSBA(sharedBuffer);
    int32Array = new Int32Array(sharedBuffer);
    uint8Array = new Uint8Array(sharedBuffer);
    sbaInitialized = true;
    
    console.log('[WORKER-CACHE] SBA integration initialized');
}

// Synchronous SBA request function
function requestFileSBA(filename, format, mustexist, enginePath) {
    if (!sbaInitialized) {
        console.warn('[WORKER-CACHE] SBA not initialized, falling back to direct download');
        return null;
    }
    
    // Find free slot
    const slotIndex = SBACache.findFreeSlot();
    if (slotIndex === -1) {
        console.warn('[WORKER-CACHE] No free SBA slots available');
        return null;
    }
    
    const operationId = SBACache.getNextOperationId();
    const slotOffset = SBACache.getSlotOffset(slotIndex);
    const stateOffset = (slotOffset + SBACache.SLOT_STATE_OFFSET) / 4;
    
    console.log(`[WORKER-CACHE] Starting SBA request ${operationId}: ${filename} (format: ${format}, engine: ${enginePath}) in slot ${slotIndex}`);
    
    // Set up request
    Atomics.store(int32Array, (slotOffset + SBACache.SLOT_OPERATION_ID_OFFSET) / 4, operationId);
    SBACache.writeString(slotOffset + SBACache.SLOT_FILENAME_OFFSET, filename, SBACache.MAX_FILENAME_LENGTH);
    Atomics.store(int32Array, (slotOffset + SBACache.SLOT_FORMAT_OFFSET) / 4, format);
    Atomics.store(int32Array, (slotOffset + SBACache.SLOT_MUSTEXIST_OFFSET) / 4, mustexist ? 1 : 0);
    // Store engine path as a simple integer ID: xetex=1, dvipdfm=2, pdftex=3
    const engineId = enginePath === 'xetex' ? 1 : enginePath === 'dvipdfm' ? 2 : 3;
    Atomics.store(int32Array, (slotOffset + SBACache.SLOT_ENGINE_PATH_OFFSET) / 4, engineId);
    
    // Increment active request count and mark as requested
    const activeCount = Atomics.add(int32Array, SBACache.ACTIVE_REQUESTS_OFFSET / 4, 1) + 1;
    console.log(`[CONTROL] Updating active request count to ${activeCount}`);
    Atomics.store(int32Array, stateOffset, SBACache.STATE_REQUESTED);
    
    // Wait for completion
    console.log(`[WORKER-CACHE] Waiting for operation ${operationId}...`);
    while (true) {
        const result = Atomics.wait(int32Array, stateOffset, SBACache.STATE_REQUESTED, 30000); // 30s timeout
        const currentState = Atomics.load(int32Array, stateOffset);
        
        if (currentState === SBACache.STATE_DONE) {
            // Success! Read result
            const resultOffset = Atomics.load(int32Array, (slotOffset + SBACache.SLOT_RESULT_OFFSET) / 4);
            const resultSize = Atomics.load(int32Array, (slotOffset + SBACache.SLOT_RESULT_SIZE_OFFSET) / 4);
            
            console.log(`[WORKER-CACHE] Operation ${operationId} completed: ${resultSize} bytes at offset ${resultOffset}`);
            
            // Copy result data
            const resultData = new Uint8Array(resultSize);
            resultData.set(uint8Array.subarray(resultOffset, resultOffset + resultSize));
            
            // Decrement active request count and free slot
            const activeCount = Atomics.sub(int32Array, SBACache.ACTIVE_REQUESTS_OFFSET / 4, 1) - 1;
            console.log(`[CONTROL] Updating active request count to ${activeCount}`);
            Atomics.store(int32Array, stateOffset, SBACache.STATE_FREE);
            
            return resultData;
            
        } else if (currentState === SBACache.STATE_ERROR) {
            // Error occurred
            console.log(`[WORKER-CACHE] Operation ${operationId} failed`);
            
            // Decrement active request count and free slot
            const activeCount = Atomics.sub(int32Array, SBACache.ACTIVE_REQUESTS_OFFSET / 4, 1) - 1;
            console.log(`[CONTROL] Updating active request count to ${activeCount}`);
            Atomics.store(int32Array, stateOffset, SBACache.STATE_FREE);
            
            return null;
            
        } else if (result === 'timed-out') {
            console.error(`[WORKER-CACHE] Operation ${operationId} timed out`);
            
            // Decrement active request count and free slot
            const activeCount = Atomics.sub(int32Array, SBACache.ACTIVE_REQUESTS_OFFSET / 4, 1) - 1;
            console.log(`[CONTROL] Updating active request count to ${activeCount}`);
            Atomics.store(int32Array, stateOffset, SBACache.STATE_FREE);
            
            return null;
        }
        
        // Continue waiting if still in PROCESSING state
    }
}

// Shared kpse_find_file_impl function with SBA caching
function kpse_find_file_impl(nameptr, format, _mustexist, enginePath) {
    let reqname = UTF8ToString(nameptr);
    let originalReqname = reqname; // Keep original for debugging
    
    // Handle dvipdfm special case
    if (reqname.startsWith("/tex/")) {
        reqname = reqname.substr(5);
    }
    
    console.log(`[FIND-FILE] Original: "${originalReqname}" → Processed: "${reqname}" | Format: ${format} | Engine: ${enginePath}`);
    
    // Don't reject filenames with slashes - they're valid for subdirectories
    // The original logic was too restrictive for font files, etc.
    
    // Construct cache key as format/filename for consistent URL building
    const cacheKey = format + "/" + reqname;
    
    // Check in-memory 404 cache first (fastest)
    if (cacheKey in texlive404_cache) {
        return 0;
    }
    
    // Check in-memory 200 cache
    if (cacheKey in texlive200_cache) {
        const savepath = texlive200_cache[cacheKey];
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    }
    
    // Try SBA cache (IndexedDB + network with persistence)
    if (sbaInitialized) {
        const fileData = requestFileSBA(reqname, format, _mustexist || false, enginePath);
        if (fileData) {
            // Success! Write to virtual file system
            let fileid;
            let savepath;
            
            try {
                // Create safe filename for local filesystem (replace slashes and colons)
                fileid = cacheKey.replace(/[\/\\:]/g, "_");
                savepath = TEXCACHEROOT + "/" + fileid;
            } catch (e) {
                console.error('[WORKER-CACHE] Error creating save path for', reqname);
                return 0;
            }
            
            FS.writeFile(savepath, fileData);
            texlive200_cache[cacheKey] = savepath;
            
            console.log(`[WORKER-CACHE] SBA cache hit: ${reqname} -> ${savepath}`);
            return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
            
        } else {
            // SBA returned null - file doesn't exist, cache the 404
            console.log(`[WORKER-CACHE] SBA cache miss (404): ${reqname}`);
            texlive404_cache[cacheKey] = 1;
            return 0;
        }
    }
    
    // Fallback to direct download (original behavior)
    console.log(`[WORKER-CACHE] Falling back to direct download for ${reqname}`);
    
    const remote_url = self.texlive_endpoint + enginePath + "/" + cacheKey;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", remote_url, false);
    xhr.timeout = 15e4;
    xhr.responseType = "arraybuffer";
    console.log("Start downloading texlive file " + remote_url);
    
    try {
        xhr.send();
    } catch (err) {
        console.log("TexLive Download Failed " + remote_url);
        texlive404_cache[cacheKey] = 1;
        return 0;
    }
    
    if (xhr.status === 200) {
        let arraybuffer = xhr.response;
        let fileid;
        let savepath;
        
        // Different file naming strategies
        try {
            // Extract just the filename from the URL
            fileid = new URL(xhr.responseURL).pathname.split("/").pop();
            // But make it unique by including the cache key info
            fileid = cacheKey.replace(/[\/\\:]/g, "_");
            savepath = TEXCACHEROOT + "/" + fileid;
        } catch (e) {
            // Fallback approach - use safe filename
            fileid = cacheKey.replace(/[\/\\:]/g, "_");
            savepath = TEXCACHEROOT + "/" + fileid;
        }
        
        FS.writeFile(savepath, new Uint8Array(arraybuffer));
        texlive200_cache[cacheKey] = savepath;
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    } else if (xhr.status === 301 || xhr.status === 404) {
        console.log("TexLive File not exists " + remote_url);
        texlive404_cache[cacheKey] = 1;
        return 0;
    }
    
    return 0;
}

// Shared kpse_find_pk_impl function (for pdftex)
function kpse_find_pk_impl(nameptr, dpi) {
    const reqname = UTF8ToString(nameptr);
    if (reqname.includes("/")) {
        return 0;
    }
    
    const cacheKey = dpi + "/" + reqname;
    if (cacheKey in pk404_cache) {
        return 0;
    }
    
    if (cacheKey in pk200_cache) {
        const savepath = pk200_cache[cacheKey];
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    }
    
    const remote_url = self.texlive_endpoint + "pdftex/pk/" + cacheKey;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", remote_url, false);
    xhr.timeout = 15e4;
    xhr.responseType = "arraybuffer";
    console.log("Start downloading texlive file " + remote_url);
    
    try {
        xhr.send();
    } catch (err) {
        console.log("TexLive Download Failed " + remote_url);
        return 0;
    }
    
    if (xhr.status === 200) {
        let arraybuffer = xhr.response;
        const pkid = xhr.getResponseHeader("pkid");
        const savepath = TEXCACHEROOT + "/" + pkid;
        FS.writeFile(savepath, new Uint8Array(arraybuffer));
        pk200_cache[cacheKey] = savepath;
        return allocate(intArrayFromString(savepath), "i8", ALLOC_NORMAL);
    } else if (xhr.status === 301 || xhr.status === 404) {
        console.log("TexLive File not exists " + remote_url);
        pk404_cache[cacheKey] = 1;
        return 0;
    }
    
    return 0;
}