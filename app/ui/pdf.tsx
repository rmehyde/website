'use client';

import {useContext, useState} from 'react';
import {Button} from "@/components/ui/button";
import {
    loadTemplate, projectsOssToLatex,
} from "@/app/lib/content/latex";
import {DimensionScores} from "@/app/lib/content/scoring";
import {ContactContext} from "@/app/contact/contactContext";
import {generateResumeLatex} from "@/app/lib/content/resume";

// TODO: switch to importing rather than script tag nonsense which works with these per here
//  https://github.com/adamkaplan0/latextableviewer/blob/398a648679cad833ab56ed8a7d1fa2de60d4d0fc/src/features/latexCompilation/latexCompilation.js

// TODO (not now): move these files to a proper lib location and ensure they're bundled correctly

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

export default function PDFComponent({weights}: { weights: DimensionScores }) {
    const {contact} = useContext(ContactContext);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");

    async function handleClick() {
        // TODO: await ready

        // TODO: cancel any previous

        setBusy(true);
        try {
            // TODO: move all loading to global upfront state which sets 'ready' when done
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

            const latex = await generateResumeLatex(weights, contact);

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
            setPdfUrl(url)

            setReady(true);
        } catch (e) {
            console.error('LaTeX compile failed:', e);
            alert('Failed – see console.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <div className="relative" style={{width: "fit-content", 'marginLeft': 'auto', 'marginRight': 'auto'}}>
                <Button
                    onClick={handleClick}
                    disabled={busy}
                >
                    {busy ? 'Compiling…' : 'Generate PDF'}
                </Button>
            </div>
            <div className={"h-8 w-full"}/>
            <object data={pdfUrl}
                    type='application/pdf'
                    width='100%' height='1000px'>
            </object>
        </div>
    );
}
