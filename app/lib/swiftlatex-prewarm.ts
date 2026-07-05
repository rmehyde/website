// Durable prewarm for the SwiftLaTeX engines.
//
// The engines resolve files with a *synchronous* kpse lookup, so an async store
// can't be consulted mid-compile. Instead each worker prepopulates its in-memory
// cache + MEMFS BEFORE the compile, reading bytes from a durable IndexedDB store
// (keyed by cacheKey + the bundle `version`). The first load (or a version bump)
// fetches the file set over the network and fills IndexedDB; every later load
// hydrates from IndexedDB with ZERO network. The set is the complete static-tree
// mirror produced by vendor/gen-cache-manifest.mjs.

export interface PrewarmEntry {
    cacheKey: string;
    endpoint: string;
}

interface PrewarmBundle {
    version: string;
    files: PrewarmEntry[];
}

interface PrewarmStats {
    hydrated: number; // served from IndexedDB (no network)
    fetched: number;  // fetched over the network and stored in IndexedDB
    failed: number;
    skipped: number;
    total: number;
}

// Structural type so this module doesn't depend on the concrete engine classes.
interface Prewarmable {
    prewarm(bundle: PrewarmBundle, seal: boolean): Promise<PrewarmStats>;
}

// Sealed: after prewarm, any lookup miss short-circuits to "absent" (no sync XHR),
// so a warm compile makes ZERO network requests — the bundle mirrors the entire
// static server, so a miss is a file the server also lacks. The worker console.warns
// on any sealed miss, which surfaces an incomplete bundle. Set to false to instead
// fall through to the normal on-demand sync-XHR (safe, but leaves residual requests).
const PREWARM_SEAL = true;

// Capture aid for pruning the static folder: set false to skip prewarm entirely, so
// a compile fetches files ON-DEMAND. The Network tab (filter `lib/xetex`, status 200)
// then lists exactly the files that were actually used — everything in the static set
// NOT in that list is a prune candidate. Leave true in production.
const PREWARM_ENABLED = true;

let bundlePromise: Promise<PrewarmBundle> | null = null;
function loadBundle(): Promise<PrewarmBundle> {
    if (!bundlePromise) {
        bundlePromise = fetch('/lib/cache-manifest.json').then((r) => {
            if (!r.ok) throw new Error('cache-manifest.json ' + r.status);
            return r.json() as Promise<PrewarmBundle>;
        });
    }
    return bundlePromise;
}

// dvipdfmx converts .xdv -> PDF: it embeds fonts (formats 32/36/47) and reads font
// maps (format 11), but it never loads XeTeX's format dump (format 10 — the 21.7 MB
// swiftlatexxetex.fmt) or the LaTeX package sources (format 26, .sty/.cls/.def). Skip
// hydrating those into its MEMFS. Static, format-based (per dvipdfmx's _formatConvert),
// not derived from a live compile. The shared IndexedDB store is unchanged — this only
// narrows what dvipdfmx copies into its own MEMFS.
const DVIPDFMX_SKIP_FORMATS = new Set(['10', '26']);
function forDvipdfmx(bundle: PrewarmBundle): PrewarmBundle {
    return {
        version: bundle.version,
        files: bundle.files.filter((f) => !DVIPDFMX_SKIP_FORMATS.has(f.cacheKey.split('/')[0])),
    };
}

export async function prewarmEngines(xetex: Prewarmable, dvi: Prewarmable): Promise<void> {
    if (!PREWARM_ENABLED) return; // on-demand fetch → Network tab shows the true hit set
    const bundle = await loadBundle();
    const [xStats, dStats] = await Promise.all([
        xetex.prewarm(bundle, PREWARM_SEAL),
        dvi.prewarm(forDvipdfmx(bundle), PREWARM_SEAL),
    ]);
    console.log('[prewarm] xetex', xStats, 'dvipdfm', dStats, PREWARM_SEAL ? '(sealed)' : '(unsealed)');
}
