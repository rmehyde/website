'use client';

import {useState} from 'react';
import {contentToLatex, loadContent} from "@/app/lib/contentschema";

// TODO: switch to importing rather than script tag nonsense which works with these

// TODO: bundle the files properly

export default function GeneratePDFButton() {
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);

    function loadXeTeX(): Promise<void> {
        return new Promise((res, rej) => {
            if ((window as any).XeTeXEngine) return res();  // already loaded?

            const tag = document.createElement('script');
            tag.src = '/lib/swiftlatex/XeTeXEngine.js';   // 👈 your public path
            tag.async = true;
            tag.onload = () => res();
            tag.onerror = () => rej(new Error('failed to load XeTeXEngine.js'));
            document.body.appendChild(tag);
        });
    }

    function loadDvipdfm(): Promise<void> {
        return new Promise((res, rej) => {
            if ((window as any).DvipdfmxEngine) {
                res();
                return;
            }

            const tag = document.createElement('script');
            tag.src = '/lib/swiftlatex/DvipdfmxEngine.js';   // 👈 your public path
            tag.async = true;
            tag.onload = () => res();
            tag.onerror = () => rej(new Error('failed to load DvipdfmxEngine.js'));
            document.body.appendChild(tag);
        });
    }


    async function handleClick() {
        setBusy(true);
        try {
            await loadXeTeX().then(() => {
                console.log("loaded XeTeXEngine.js")
            });
            await loadDvipdfm().then(() => {
                console.log("loaded DvipdfmxEngine.js")
            });


            // @ts-ignore (provided dynamically)
            const XeTeXEngine = (window as any).XeTeXEngine as any;
            if (!XeTeXEngine) throw new Error('XeTeXEngine still missing!');
            // @ts-ignore
            const SwiftLaTeXDvipdfm = (window as any).DvipdfmxEngine;
            if (!SwiftLaTeXDvipdfm) throw new Error('DvipdfmxEngine not found');

            const engine = new XeTeXEngine();
            await engine.loadEngine();  // Must load the wasm engine

            const parsedContent = await loadContent('/content/calendupe.yaml');
            const projectContent = contentToLatex(parsedContent);

            // \usepackage{fontspec}
            // \setmainfont{Georgia}

            const latex = String.raw`
\RequirePackage{latexrelease}[2020-02-02]
\documentclass{article}
\usepackage[dvipsnames]{xcolor}
\definecolor{Cobalt}{HTML}{0047AB}
\usepackage{hyperref, fontspec, CharisSIL}
\hypersetup{
    colorlinks=true,
    pdfhighlight=/N,
    linkcolor=Cobalt,
    urlcolor=Cobalt,
    citecolor=Cobalt,
}
\usepackage{soul}
\setul{0.3ex}{0.15ex}
\setulcolor{Cobalt} 
\newcommand*\uhref[2]{\href{#1}{\ul{#2}}}
\begin{document}
${projectContent}
\end{document}`;

            // const pdfBlob = new Blob([result.pdf], { type: "application/pdf" });
            // const url = URL.createObjectURL(pdfBlob);
            // window.open(url, '_blank');

            // Write LaTeX source to virtual file system
            engine.writeMemFSFile("main.tex", latex);
            engine.setEngineMainFile("main.tex");

            // Compile to .xdv
            const result = await engine.compileLaTeX();
            console.log(result.log)

            // Access the DvipdfmxEngine from the global window object

            const DvipdfmxEngine = (window as any).DvipdfmxEngine;
            const converter = new DvipdfmxEngine();

            if (!DvipdfmxEngine) {
                throw new Error('DvipdfmxEngine is not available on the window object.');
            }

            await converter.loadEngine();

            // Write the .xdv file to the engine's virtual file system
            converter.writeMemFSFile("main.xdv", result.pdf);

            // Set the main file for the engine
            converter.setEngineMainFile("main.xdv");

            // Compile the .xdv file to generate the PDF
            const pdfResult = await converter.compilePDF();
            console.log(pdfResult.log)

            // Create a Blob from the PDF result
            const pdfBlob = new Blob([pdfResult.pdf], {type: "application/pdf"});
            const url = URL.createObjectURL(pdfBlob);

            // Trigger the download of the PDF
            const a = document.createElement('a');
            a.href = url;
            a.download = 'output.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

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
