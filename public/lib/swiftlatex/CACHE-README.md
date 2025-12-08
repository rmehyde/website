# SwiftLaTeX SharedArrayBuffer + IndexedDB Cache Implementation

## Current Status: 🚧 **WORK IN PROGRESS** 🚧

## Objective
Implement persistent caching for SwiftLaTeX TeXLive file downloads using SharedArrayBuffer + IndexedDB to:
- Eliminate repeated network requests across browser sessions
- Make async IndexedDB operations appear synchronous to WASM code
- Avoid the race conditions that plagued previous postMessage-based approaches

## Architecture Overview

### The Solution: Single-Channel Synchronization
Unlike previous attempts that failed due to race conditions between SharedArrayBuffer signaling and postMessage data transfer, this implementation uses **SharedArrayBuffer for both coordination AND data transfer**.

```
Worker Thread                    Main Thread
─────────────                    ───────────
kpse_find_file_impl()
├─ Check in-memory cache
├─ requestFileSBA() 
│  ├─ Write request to SBA  
│  ├─ Set state=REQUESTED
│  └─ Atomics.wait()     ────────→ Monitor SBA for requests
└─ Wake up, read result         ├─ IndexedDB lookup
   from same SBA location       ├─ Network download if needed
                                ├─ Write data to SBA
                                ├─ Set state=DONE  
                                └─ Atomics.notify()
```

## Implementation Components

### Core Files
- **`sba-cache.js`**: 50MB SharedArrayBuffer utilities and structure definitions
- **`main-thread-cache.js`**: IndexedDB handler that monitors SBA and fulfills requests  
- **`swiftlatex-shared.js`**: Updated worker-side cache logic with SBA integration
- **`XeTeXEngine.js`/`DvipdfmxEngine.js`**: Engine initialization with cache system setup
- **Worker scripts**: Updated to handle SBA initialization messages

### SharedArrayBuffer Structure (50MB)
```
[0-63]:      Control block (operation IDs, active request count)
[64-1087]:   Request slots (64 bytes × 16 slots)
[1088-end]:  File data area (~49MB for actual file content)
```

**Request Slot Layout (64 bytes):**
- `[0-3]`: operationId 
- `[4-7]`: state (FREE/REQUESTED/PROCESSING/DONE/ERROR)
- `[8-11]`: resultOffset (in file data area)
- `[12-15]`: resultSize  
- `[16-47]`: filename (32 chars max)
- `[48-51]`: format (subfolder number)
- `[52-55]`: mustexist flag
- `[56-59]`: engineId (1=xetex, 2=dvipdfm, 3=pdftex)

## What Works ✅

1. **SharedArrayBuffer initialization**: 50MB buffer creates successfully
2. **IndexedDB setup**: Database and object stores create properly with versioning
3. **Worker communication**: SBA gets passed to workers and views are set up
4. **Basic request flow**: Workers can write requests, main thread can read them
5. **Engine path handling**: Different engines can specify their TeXLive directory
6. **Clean logging**: Debug output shows request flow clearly
7. **File system safety**: Local filenames properly escape slashes and special characters

## What Doesn't Work ❌

### 1. **Path Corruption Issues** 🐛
Still seeing mangled paths like:
- `36/36_CharisSIL-Regular.ttf/rsrc` 
- `32/36_CharisSIL-Regular.ttf`

**Root Cause**: Unclear - the `36_` prefix suggests filename corruption is happening before our cache system even receives the request.

### 2. **Inconsistent Path Construction** 🐛
The relationship between:
- **WASM request**: What the C code is asking for
- **Format number**: Subfolder in TeXLive (e.g., `11`, `32`, `36`) 
- **Filename**: Actual file name
- **Full path**: How to construct the final URL

Is still not correctly understood or implemented.

### 3. **Directory Structure Mismatch** 🐛
- Files exist in `/lib/xetex/11/ckx.map`, `/lib/xetex/36/CharisSIL-Regular.ttf`
- System requests `/lib/xetex/ckx.map` (missing subfolder) or constructs wrong paths

## Technical Challenges Solved ✅

1. **Variable Redeclarations**: Fixed conflicting global variables between cache files
2. **Script Loading Race Conditions**: Made cache initialization properly async with Promise handling
3. **Export Format Issues**: Fixed module exports to work in browser environment  
4. **Engine Path Separation**: Both XeTeX and DviPDFm now correctly use shared `/lib/xetex/` directory

## Current Debugging Strategy

The `[FIND-FILE]` logs show what WASM is actually requesting:
```
[FIND-FILE] Original: "pdftex.map" → Processed: "pdftex.map" | Format: 11 | Engine: xetex
```

This helps trace how:
1. **Original**: Raw WASM request
2. **Processed**: After `/tex/` prefix removal  
3. **Format**: Subfolder number
4. **Engine**: Which TeXLive directory to use

## Known Issues to Investigate

1. **Where does `36_` prefix come from?** The filename corruption happens before our cache system
2. **What creates `/rsrc` suffix?** Some requests have mysterious `/rsrc` appended
3. **Format vs. path relationship**: When should format be used vs. ignored for URL construction?
4. **Multiple request patterns**: Different file types may need different path handling logic

## Browser Requirements

- **SharedArrayBuffer**: Requires cross-origin isolation headers:
  ```
  Cross-Origin-Embedder-Policy: require-corp  
  Cross-Origin-Opener-Policy: same-origin
  ```
- **IndexedDB**: Universally supported
- **Web Workers**: Required for SwiftLaTeX
- **Atomics**: Required for synchronization

## Next Steps

1. **Deep path debugging**: Add more granular logging to understand where path corruption originates
2. **WASM analysis**: May need to examine the C/C++ side to understand request patterns
3. **File type categorization**: Different file types (fonts, maps, styles) may need different handling
4. **Fallback strategies**: Implement multiple URL patterns to try when files aren't found
5. **Isolation & locking**: Our active request count logging confirms that only one request is happening at a time. But this needs to be enforced via a locking mechanism.
6. **Error handling**: Graceful degredation is needed around the IndexedDB caching system. It's a nice-to-have optimization which should fail gracefully.

## Implementation Notes

- **Race condition eliminated**: Single SBA channel avoids postMessage timing issues  
- **Memory efficient**: 50MB allows caching substantial portions of TeXLive
- **Backward compatible**: Falls back gracefully to direct downloads when SBA unavailable
- **Engine agnostic**: Works with XeTeX, DviPDFm, and can extend to PDFTeX

---

**Status**: Core infrastructure complete, path handling logic needs refinement based on empirical testing and WASM behavior analysis.