'use client';

import React, {useContext, useState, useRef, useCallback, useEffect} from 'react';
import {DimensionScores} from "@/app/lib/content/scoring";
import {ContactContext} from "@/app/contact/contactContext";
import {generateResumeLatex} from "@/app/lib/content/resume";

// TODO: needs error handling! should show error to user if failed

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

type RenderState = 'idle' | 'rendering' | 'pending';

export default function PDFComponent({onWeightsComplete}: {
    onWeightsComplete?: (callback: (weights: DimensionScores) => void) => void;
}) {
    const {contact} = useContext(ContactContext);
    const [renderState, setRenderState] = useState<RenderState>('idle');
    const [pdfUrl, setPdfUrl] = useState("");
    const pendingWeightsRef = useRef<DimensionScores | null>(null);

    const renderPDF = useCallback(async (weightsToRender: DimensionScores) => {
        setRenderState('rendering');
        
        // Clear any pending render since we're starting fresh
        pendingWeightsRef.current = null;
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

            const latex = await generateResumeLatex(weightsToRender, contact);

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

        } catch (e) {
            console.error('LaTeX compile failed:', e);
            alert('Failed – see console.');
        } finally {
            // Check if there's a pending render to start
            const pendingWeights = pendingWeightsRef.current;
            if (pendingWeights) {
                // Clear the pending weights and start new render
                pendingWeightsRef.current = null;
                setRenderState('pending');
                // Use setTimeout to avoid immediate recursion
                setTimeout(() => renderPDF(pendingWeights), 0);
            } else {
                setRenderState('idle');
            }
        }
    }, [contact]);

    // Function to trigger render (from button or weight changes)
    const triggerRender = useCallback((weightsToRender: DimensionScores) => {
        if (renderState === 'idle') {
            renderPDF(weightsToRender);
        } else {
            // Queue these weights for after current render
            pendingWeightsRef.current = weightsToRender;
            if (renderState === 'rendering') {
                setRenderState('pending');
            }
        }
    }, [renderState, renderPDF]);
    
    // Register triggerRender with parent on mount (only once)
    const hasRegisteredRef = useRef(false);
    useEffect(() => {
        if (!hasRegisteredRef.current && onWeightsComplete) {
            onWeightsComplete(triggerRender);
            hasRegisteredRef.current = true;
        }
    }, [onWeightsComplete]); // Remove triggerRender from deps to prevent re-registration


    return (
        <div>
            <div className="relative">
                <object data={pdfUrl}
                        type='application/pdf'
                        width='100%' height='1000px'>
                </object>
                {renderState !== 'idle' && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-card p-4 rounded-lg shadow-lg border flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="text-sm font-medium">
                                {'Generating PDF...'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
