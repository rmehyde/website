/* components/GeneratePDFButton.tsx */
'use client';

import { useState } from 'react';
import {contentToLatex, loadContent} from "@/app/lib/contentschema";

export default function GeneratePDFButton() {
    const [ready, setReady] = useState(false);
    const [busy,  setBusy]  = useState(false);

    // 1️⃣ load the promise poly-fill once
    // TODO: this needs a hook to ensure it's loaded as well
    function injectPromisePolyfill() {
        if ((window as any).promise) return;             // already present?
        const tag = document.createElement('script');
        tag.src = '/lib/texlive.js/promise.js';
        document.body.appendChild(tag);
    }

    // —–––– load script exactly once ––––––
    function loadPdfTeX(): Promise<void> {
        return new Promise((res, rej) => {
            if (window.PDFTeX) return res();                // already loaded?

            injectPromisePolyfill();

            const tag      = document.createElement('script');
            tag.src        = '/lib/texlive.js/pdftex.js';      // build bundle
            tag.async      = true;
            tag.onload     = () => res();
            tag.onerror    = () => rej(new Error('failed to load pdftex.js'));
            document.body.appendChild(tag);
        });
    }

    async function handleClick() {
        setBusy(true);
        try {
            await loadPdfTeX();                             // ← classic script load

            // @ts-ignore  (added by the script we just injected)
            const PDFTeX = window.PDFTeX as any;
            if (!PDFTeX) throw new Error('PDFTeX still missing!');

            const parsedContent = await loadContent('/content/calendupe.yaml')
            const projectContent = contentToLatex(parsedContent);

            const engine = new PDFTeX('/lib/texlive.js/pdftex-worker.js');  // worker + wasm auto-found
            const latex  = String.raw`

\documentclass{article}
\usepackage{hyperref}
\usepackage{fontspec}
\begin{document}
${projectContent}
\end{document}`;
            console.log(latex);
            // TODO: this can throw
            const url    = await engine.compile(latex);     // → blob URL
            window.open(url, '_blank');
            setReady(true);
        } catch (e) {
            console.error('LaTeX compile failed:', e);
            alert('Failed – see console.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
        >
            {busy ? 'Compiling…'
                : ready ? 'Generate PDF again'
                    : 'Generate PDF'}
        </button>
    );
}
