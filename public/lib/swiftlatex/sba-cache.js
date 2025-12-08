// SharedArrayBuffer Cache System for SwiftLaTeX
// Provides synchronous IndexedDB access from workers using SharedArrayBuffer + Atomics

// Constants
const SBA_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CONCURRENT_REQUESTS = 16;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 3MB per file
const MAX_FILENAME_LENGTH = 31; // null-terminated in 32 bytes

// Memory layout offsets
const CONTROL_BLOCK_OFFSET = 0;
const CONTROL_BLOCK_SIZE = 64;
const REQUEST_SLOTS_OFFSET = CONTROL_BLOCK_OFFSET + CONTROL_BLOCK_SIZE;
const REQUEST_SLOT_SIZE = 64;
const REQUEST_SLOTS_SIZE = REQUEST_SLOT_SIZE * MAX_CONCURRENT_REQUESTS;
const FILE_DATA_OFFSET = REQUEST_SLOTS_OFFSET + REQUEST_SLOTS_SIZE;
const FILE_DATA_SIZE = SBA_SIZE - FILE_DATA_OFFSET;

// Control block offsets
const NEXT_OPERATION_ID_OFFSET = 0;
const ACTIVE_REQUESTS_OFFSET = 4;

// Request slot offsets (relative to slot start)
const SLOT_OPERATION_ID_OFFSET = 0;
const SLOT_STATE_OFFSET = 4;
const SLOT_RESULT_OFFSET = 8;
const SLOT_RESULT_SIZE_OFFSET = 12;
const SLOT_FILENAME_OFFSET = 16;
const SLOT_FORMAT_OFFSET = 48;
const SLOT_MUSTEXIST_OFFSET = 52;
const SLOT_ENGINE_PATH_OFFSET = 56; // 8 bytes for engine path string

// States
const STATE_FREE = 0;
const STATE_REQUESTED = 1;
const STATE_PROCESSING = 2;
const STATE_DONE = 3;
const STATE_ERROR = 4;

// Global SBA instance - use different variable names to avoid conflicts
let globalSharedBuffer = null;
let globalInt32Array = null;
let globalUint8Array = null;
let globalNextFileDataOffset = FILE_DATA_OFFSET;

/**
 * Initialize the SharedArrayBuffer cache system
 * @returns {SharedArrayBuffer} The created shared buffer
 */
function initializeSBA() {
    if (globalSharedBuffer) {
        console.warn('[SBA] SharedArrayBuffer already initialized');
        return globalSharedBuffer;
    }

    console.log('[SBA] Initializing 50MB SharedArrayBuffer cache');
    
    globalSharedBuffer = new SharedArrayBuffer(SBA_SIZE);
    globalInt32Array = new Int32Array(globalSharedBuffer);
    globalUint8Array = new Uint8Array(globalSharedBuffer);
    
    // Initialize control block
    Atomics.store(globalInt32Array, NEXT_OPERATION_ID_OFFSET / 4, 1); // Start operation IDs at 1
    Atomics.store(globalInt32Array, ACTIVE_REQUESTS_OFFSET / 4, 0);
    
    // Initialize all request slots to FREE
    for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
        const slotOffset = REQUEST_SLOTS_OFFSET + (i * REQUEST_SLOT_SIZE);
        Atomics.store(globalInt32Array, (slotOffset + SLOT_STATE_OFFSET) / 4, STATE_FREE);
    }
    
    // Reset file data offset
    globalNextFileDataOffset = FILE_DATA_OFFSET;
    
    console.log(`[SBA] Initialized: ${SBA_SIZE} bytes, ${MAX_CONCURRENT_REQUESTS} slots, ${FILE_DATA_SIZE} bytes for file data`);
    return globalSharedBuffer;
}

/**
 * Get the shared buffer (must be initialized first)
 * @returns {SharedArrayBuffer}
 */
function getSBA() {
    if (!globalSharedBuffer) {
        throw new Error('[SBA] SharedArrayBuffer not initialized. Call initializeSBA() first.');
    }
    return globalSharedBuffer;
}

/**
 * Set up SBA views from an existing SharedArrayBuffer
 * @param {SharedArrayBuffer} sab
 */
function setupSBA(sab) {
    globalSharedBuffer = sab;
    globalInt32Array = new Int32Array(globalSharedBuffer);
    globalUint8Array = new Uint8Array(globalSharedBuffer);
    console.log('[SBA] Set up views for existing SharedArrayBuffer');
}

/**
 * Find a free request slot
 * @returns {number} Slot index or -1 if no free slots
 */
function findFreeSlot() {
    for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
        const slotOffset = REQUEST_SLOTS_OFFSET + (i * REQUEST_SLOT_SIZE);
        const state = Atomics.load(int32Array, (slotOffset + SLOT_STATE_OFFSET) / 4);
        if (state === STATE_FREE) {
            return i;
        }
    }
    return -1;
}

/**
 * Get slot offset for a given slot index
 * @param {number} slotIndex
 * @returns {number}
 */
function getSlotOffset(slotIndex) {
    return REQUEST_SLOTS_OFFSET + (slotIndex * REQUEST_SLOT_SIZE);
}

/**
 * Allocate space in file data area
 * @param {number} size
 * @returns {number} Offset or -1 if not enough space
 */
function allocateFileData(size) {
    const alignedSize = Math.ceil(size / 8) * 8; // 8-byte alignment
    if (globalNextFileDataOffset + alignedSize > SBA_SIZE) {
        console.error(`[SBA] Not enough space for ${size} bytes (aligned: ${alignedSize})`);
        return -1;
    }
    const offset = globalNextFileDataOffset;
    globalNextFileDataOffset += alignedSize;
    return offset;
}

/**
 * Write a string to the SBA at given offset
 * @param {number} offset
 * @param {string} str
 * @param {number} maxLength
 */
function writeString(offset, str, maxLength) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str.substring(0, maxLength - 1));
    globalUint8Array.set(encoded, offset);
    globalUint8Array[offset + encoded.length] = 0; // null terminator
}

/**
 * Read a null-terminated string from the SBA
 * @param {number} offset
 * @param {number} maxLength
 * @returns {string}
 */
function readString(offset, maxLength) {
    const bytes = [];
    for (let i = 0; i < maxLength; i++) {
        const byte = globalUint8Array[offset + i];
        if (byte === 0) break;
        bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Get next operation ID (atomic increment)
 * @returns {number}
 */
function getNextOperationId() {
    return Atomics.add(globalInt32Array, NEXT_OPERATION_ID_OFFSET / 4, 1);
}

// Export for use in both main thread and workers
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        initializeSBA,
        getSBA,
        setupSBA,
        findFreeSlot,
        getSlotOffset,
        allocateFileData,
        writeString,
        readString,
        getNextOperationId,
        // Constants
        SBA_SIZE,
        MAX_CONCURRENT_REQUESTS,
        MAX_FILE_SIZE,
        MAX_FILENAME_LENGTH,
        STATE_FREE,
        STATE_REQUESTED,
        STATE_PROCESSING,
        STATE_DONE,
        STATE_ERROR,
        SLOT_OPERATION_ID_OFFSET,
        SLOT_STATE_OFFSET,
        SLOT_RESULT_OFFSET,
        SLOT_RESULT_SIZE_OFFSET,
        SLOT_FILENAME_OFFSET,
        SLOT_FORMAT_OFFSET,
        SLOT_MUSTEXIST_OFFSET,
        SLOT_ENGINE_PATH_OFFSET,
        NEXT_OPERATION_ID_OFFSET,
        ACTIVE_REQUESTS_OFFSET
    };
} else {
    // Browser environment - attach to self (works in both main thread and workers)
    self.SBACache = {
        initializeSBA,
        getSBA,
        setupSBA,
        findFreeSlot,
        getSlotOffset,
        allocateFileData,
        writeString,
        readString,
        getNextOperationId,
        // Constants
        SBA_SIZE,
        MAX_CONCURRENT_REQUESTS,
        MAX_FILE_SIZE,
        MAX_FILENAME_LENGTH,
        STATE_FREE,
        STATE_REQUESTED,
        STATE_PROCESSING,
        STATE_DONE,
        STATE_ERROR,
        SLOT_OPERATION_ID_OFFSET,
        SLOT_STATE_OFFSET,
        SLOT_RESULT_OFFSET,
        SLOT_RESULT_SIZE_OFFSET,
        SLOT_FILENAME_OFFSET,
        SLOT_FORMAT_OFFSET,
        SLOT_MUSTEXIST_OFFSET,
        SLOT_ENGINE_PATH_OFFSET,
        NEXT_OPERATION_ID_OFFSET,
        ACTIVE_REQUESTS_OFFSET
    };
}