# SwiftLaTeX Persistent Cache Investigation

## Objective

Implement persistent caching for SwiftLaTeX TeXLive file downloads using IndexedDB to eliminate repeated network requests across browser sessions. The challenge was making async IndexedDB operations appear synchronous to WASM code that expects blocking file system calls.

## The Challenge

SwiftLaTeX runs in web workers and uses synchronous `kpse_find_file_impl()` functions called directly from WASM. These functions expect to:
1. Look up a file (e.g., "article.cls")
2. Return a memory pointer immediately 
3. Cannot be made async without rebuilding WASM with Asyncify

The problem: IndexedDB is inherently asynchronous, but WASM expects synchronous responses.

## What We Tried

### Attempt 1: Synchronous IndexedDB API
**Goal**: Use the W3C spec's synchronous IndexedDB API in web workers.
**Result**: ❌ **Failed** - No browser has implemented the synchronous API and it's considered "at risk" for removal.

### Attempt 2: SharedArrayBuffer + Atomics Synchronization
**Goal**: Use SharedArrayBuffer and `Atomics.wait()` to block the worker until async IndexedDB operations complete.

**Architecture**: 
```
Worker Thread              Main Thread
─────────────              ───────────
kpse_find_file_impl()  
├─ Check in-memory cache
├─ Check IndexedDB (sync wrapper)
│  ├─ postMessage(request) ───→ handleRequest()
│  ├─ Atomics.wait()       ←── async IndexedDB ops
│  └─ return result        ←── postMessage(result)
└─ Network request (fallback)
```

**What Worked**:
- ✅ SharedArrayBuffer + Atomics available in cross-origin isolated context
- ✅ Basic blocking pattern functional
- ✅ IndexedDB operations successful in main thread
- ✅ File storage and retrieval with TTL and versioning
- ✅ Cache invalidation on version bumps

**What Failed**:
- ❌ **Race conditions** between SharedArrayBuffer signaling and postMessage delivery
- ❌ Complex state management trying to synchronize two async channels
- ❌ Unreliable message ordering across worker boundaries

### Specific Race Condition Issues

The fundamental problem was coordinating two asynchronous communication channels:

1. **SharedArrayBuffer**: Used for `Atomics.wait()` blocking and `Atomics.notify()` wakeup
2. **postMessage**: Used for actual data transfer

**The Race**:
```
Main Thread                 Worker Thread
───────────                 ─────────────
processRequest()            
├─ IndexedDB operation      
├─ Atomics.store(1) ────────→ Atomics.wait() returns ✓
├─ Atomics.notify() ────────→ (worker wakes up)
└─ postMessage(result) ─────→ (message not processed yet ❌)
                             worker tries to read result → NULL
```

**Timeline Example**:
```
14:15:55.899 🏁 [SYNC] Operation completed with status: 1
14:15:55.899 ⚠️ [SYNC] No result found for operation ID: 1  ← Worker checks too early
14:15:55.899 📥 [SYNC] Received result from main thread: 1 SUCCESS ← Arrives 1ms later
```

### Failed Solutions Attempted

1. **setTimeout delays** - Adding artificial waits (terrible practice)
2. **Busy waiting loops** - Blocking worker thread inefficiently  
3. **Complex state machines** - Over-engineering with multiple states
4. **Result data in SharedArrayBuffer** - Trying to store complex objects in shared memory
5. **Multiple synchronization points** - Waiting for both ready signal AND message processing

## Architecture That Partially Worked

### File Structure
```
swiftlatex-shared.js           # Worker-side cache logic
main-thread-indexeddb.js       # Main thread IndexedDB handler  
swiftlatexxetex.js            # XeTeX engine (updated)
swiftlatexdvipdfm.js          # DviPDFm engine (updated)  
swiftlatexpdftex.js           # PDFTeX engine (updated)
```

### Cache Flow (When Working)
```
1. In-memory cache (fastest) - Per-invocation maps
   ├─ texlive404_cache: Known missing files
   └─ texlive200_cache: Local file paths

2. IndexedDB persistent cache (medium) - Cross-session storage  
   ├─ TTL expiration (30 days)
   ├─ Version-based invalidation
   └─ Blob storage for file contents

3. Network requests (slowest) - TeXLive endpoint downloads
   └─ Results stored in both cache layers
```

### Configuration
```javascript
self.SWIFTLATEX_CONFIG = {
    texlive_endpoint: "/lib/",
    cache_version: 1,              // Increment to purge cache
    cache_ttl_ms: 30 * 24 * 60 * 60 * 1000  // 30 days
};
```

## Browser Requirements

- **SharedArrayBuffer**: Requires cross-origin isolation headers:
  ```
  Cross-Origin-Embedder-Policy: require-corp  
  Cross-Origin-Opener-Policy: same-origin
  ```
- **IndexedDB**: Universally supported
- **Web Workers**: Required for SwiftLaTeX

## Lessons Learned

### Technical Insights
1. **Atomics.wait() blocks the entire worker thread** - No setTimeout/Promise callbacks can run
2. **postMessage delivery is not synchronous** - Messages are queued and processed asynchronously
3. **SharedArrayBuffer transfers are problematic** - Don't pass SABs through postMessage, share them at initialization
4. **Race conditions are fundamental** - Two async channels cannot be reliably synchronized without proper ordering guarantees

### Design Patterns
- ✅ **SharedArrayBuffer for state only** - Don't store data, just coordination flags
- ✅ **postMessage for data only** - Keep complex objects in messages  
- ❌ **Mixing sync and async paradigms** - Extremely difficult to get right
- ❌ **Time-based solutions** - Always indicate deeper architectural problems

## Alternative Approaches to Consider

### 1. Asyncify (Rebuild WASM)
Rebuild SwiftLaTeX with Emscripten's Asyncify feature to support async function calls from WASM.

**Pros**: Clean async/await throughout call chain
**Cons**: Requires rebuilding WASM, increased binary size, complexity

### 2. Pre-population Strategy  
Background-load common files into IndexedDB, keep sync lookup for cache hits only.

**Pros**: Maintains sync interface, improves cache hit performance
**Cons**: Cache misses still require network requests, limited coverage

### 3. Service Worker Interception
Use Service Worker to intercept TeXLive network requests and serve from cache.

**Pros**: Transparent to application, works with existing sync code
**Cons**: Limited browser support in workers, complex SW lifecycle

### 4. OPFS with Synchronous Access  
Use Origin Private File System's sync APIs available in dedicated workers.

**Pros**: True synchronous file operations
**Cons**: Limited browser support (no Firefox), still requires cross-origin isolation

## Current State

The persistent cache implementation is **functionally complete** but **unreliable due to race conditions**. The code successfully:

- ✅ Initializes IndexedDB with proper schema
- ✅ Stores and retrieves files with TTL
- ✅ Handles cache version invalidation  
- ✅ Falls back gracefully to in-memory cache
- ❌ **Has race conditions in worker/main thread coordination**

## Recommendation

**Abandon the SharedArrayBuffer approach** due to fundamental race condition issues. Consider:

1. **Service Worker approach** for transparent network interception
2. **Asyncify rebuild** if willing to modify WASM build process  
3. **Enhanced in-memory caching** with background pre-population
4. **Wait for OPFS broader browser support** and revisit in 6-12 months

The investigation proved that **synchronous-over-async patterns are extremely difficult to implement reliably** in JavaScript's event-driven environment.

## Files Modified

- `swiftlatex-shared.js` - Centralized cache logic with persistent storage
- `main-thread-indexeddb.js` - Main thread IndexedDB operations handler
- `swiftlatexxetex.js` - Updated to use shared cache functions  
- `swiftlatexdvipdfm.js` - Updated to use shared cache functions
- `swiftlatexpdftex.js` - Updated to use shared cache functions
- `test-cache.html` - Testing harness for cache functionality

The DRY refactoring (moving duplicate code to shared functions) was **successful and should be kept**. Only the persistent cache layer needs to be removed/reworked.