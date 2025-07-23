
import { DvipdfmxEngine } from '@/public/lib/swiftlatex2/DvipdfmxEngine';
import { XeTeXEngine }    from '@/public/lib/swiftlatex2/XeTeXEngine';

const xetexEngine = new XeTeXEngine();
const dviEngine   = new DvipdfmxEngine();

// internal single-initialization promise
let initPromise: Promise<void> | null = null;

/**
 * Initialize both engines only once. Multiple calls share the same promise.
 */
export const initializeLatexEngines = (): Promise<void> => {
    if (!initPromise) {
        initPromise = (async () => {
            try {
                console.log('initializing LaTeX engines…');
                await xetexEngine.loadEngine();
                console.log('xetexEngine engine loaded');
                await dviEngine.loadEngine();
                console.log('dviEngine engine loaded');
                console.log('LaTeX engines loaded');
            } catch (e) {
                console.warn('LaTeX engine init error (likely duplicate load)', e);
            }
        })();
    }
    return initPromise;
};

// helper to race promise against abort
function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => {
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then(
            res => {
                signal.removeEventListener('abort', onAbort);
                resolve(res);
            }, err => {
                signal.removeEventListener('abort', onAbort);
                reject(err);
            }
        );
    });
}

// wait until engine is both loaded and not currently busy
function waitEngineReady(engine: any, signal?: AbortSignal): Promise<void> {
    if (!signal && engine.isReady()) return Promise.resolve();
    return raceAbort(new Promise<void>((resolve, reject) => {
        const check = () => {
            if (engine.isReady()) {
                resolve();
            } else if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    }), signal);
}

/**
 * compileLaTeX to PDF, supports cancellation via optional AbortSignal.
 */
export const compileLatex = async (latexCode: string, signal?: AbortSignal): Promise<string> => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // Ensure engines are both warmed up & idle
    await waitEngineReady(xetexEngine, signal);
    await waitEngineReady(dviEngine, signal);

    // XeTeX pass: write & compile
    xetexEngine.writeMemFSFile('main.tex', latexCode);
    xetexEngine.setEngineMainFile('main.tex');
    const xdvResult = await raceAbort(xetexEngine.compileLaTeX(), signal);
    console.log(xdvResult.log);
    if (xdvResult.status !== 0) {
        throw new Error('XeTeX failed:\n' + xdvResult.log);
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // DviPdfMx pass: write & compile
    dviEngine.writeMemFSFile('main.xdv', xdvResult.pdf);
    dviEngine.setEngineMainFile('main.xdv');
    const pdfResult = await raceAbort(dviEngine.compilePDF(), signal);
    console.log(pdfResult.log);
    if (pdfResult.status !== 0) {
        throw new Error('Dvipdfmx failed:\n' + pdfResult.log);
    }

    // blob & URL
    const blob = new Blob([pdfResult.pdf], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
};

export const revokeCompiledPdfUrl = (url: string) => {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
};
