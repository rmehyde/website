'use client';

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {DimensionScores} from "@/app/lib/content/scoring";
import {useContactStore} from "@/app/contact/contactContext";
import {generateResumeLatex} from "@/app/lib/content/resume";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {Download} from "lucide-react";
import {XeTeXEngine} from "@/app/lib/swiftlatex/XeTeXEngine";
import {DvipdfmxEngine} from "@/app/lib/swiftlatex/DvipdfmxEngine";

const PDF_FRAGMENTS = "#pagemode=none&navpanes=0&toolbar=0&sidebar=0&view=fitH"
const TEX_ENDPOINT = "/lib/";
// const TEX_ENDPOINT = "http://localhost:5000/";

// TODO: broke the "queueing" mechanism. rapid changes now gives:
//   LaTeX compile failed: Error: Engine is still spinning or not ready yet!

const xetexEngine = new XeTeXEngine();
const divpdfmxEngine = new DvipdfmxEngine();

// TODO: needs error handling! should show error to user if failed

// TODO (not now): move these files to a proper lib location and ensure they're bundled correctly

type RenderState = 'idle' | 'rendering' | 'pending';

export default function PDFComponent({onWeightsComplete}: {
    onWeightsComplete?: (callback: (weights: DimensionScores) => void) => void;
}) {
    const contact = useContactStore((state) => state.contact);
    const [renderState, setRenderState] = useState<RenderState>('idle');
    const [pdfUrl, setPdfUrl] = useState("");
    // const [currentWeights, setCurrentWeights] = useState<DimensionScores | null>(null);
    const pendingWeightsRef = useRef<DimensionScores | null>(null);

    const renderPDF = useCallback(async (weightsToRender: DimensionScores) => {
        setRenderState('rendering');
        
        // Clear any pending render since we're starting fresh
        pendingWeightsRef.current = null;
        try {
            console.log('About to load XeTeX engine...');
            console.log('XeTeX engine status:', xetexEngine.latexWorkerStatus);
            await xetexEngine.loadEngine().then(() => {
                console.log('XeTeX engine loaded successfully');
                xetexEngine.setTexliveEndpoint(TEX_ENDPOINT)
            }).catch(error => {
                console.error('XeTeX engine failed to load:', error);
            });

            console.log("completed loading engine and setting endpoint")

            const latex = await generateResumeLatex(weightsToRender, contact);

            // const pdfBlob = new Blob([result.pdf], { type: "application/pdf" });
            // const url = URL.createObjectURL(pdfBlob);
            // window.open(url, '_blank');

            // Write LaTeX source to virtual file system
            xetexEngine.writeMemFSFile("main.tex", latex);
            xetexEngine.setEngineMainFile("main.tex");

            // Compile to .xdv
            console.log("calling xetex compileLaTeX()...")
            const result = await xetexEngine.compileLaTeX();
            console.log("got result from xetex", result.log)


            console.log("loading divpdfmxEngine")
            await divpdfmxEngine.loadEngine().then(() => {
                console.log('Dvipdfmx engine loaded successfully');
                divpdfmxEngine.setTexliveEndpoint(TEX_ENDPOINT)
            }).catch(error => {
                console.error('Dvipdfmx engine failed to load:', error);
            });

            // Write the .xdv file to the engine's virtual file system
            divpdfmxEngine.writeMemFSFile("main.xdv", result.pdf);

            // Set the main file for the engine
            divpdfmxEngine.setEngineMainFile("main.xdv");

            // Compile the .xdv file to generate the PDF
            const pdfResult = await divpdfmxEngine.compilePDF();
            console.log(pdfResult.log)

            // Create a Blob from the PDF result
            const pdfBlob = new Blob([pdfResult.pdf], {type: "application/pdf"});
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            // setCurrentWeights(weightsToRender);

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

    // TODO: dial pdf viewer options
    //   hide panel: #navpanes=0 on chrome, #pagemode=none on firefox
    //   chromium params: https://pdfobject.com/examples/pdf-open-params.html#
    return (
        <div>
            <div className="flex justify-center mb-6">
                {(renderState !== 'idle') ? (
                    <Button disabled>
                        <Spinner/>
                        Generating PDF...
                    </Button>
                ) : (
                    <Button asChild>
                        {/* TODO: this shouldn't be available when generation failed! see note on failures above */}
                        <a href={pdfUrl} download={`reesehyde-resume.pdf`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Resume
                        </a>
                    </Button>
                )}
            </div>
            <div className="relative">
                {pdfUrl ? (
                    <object data={pdfUrl + PDF_FRAGMENTS}
                            type='application/pdf'
                            width='100%' height='1000px'>
                    </object>
                ) : (
                    <div className="w-full h-[1000px] bg-gray-300"></div>
                )}
                {renderState !== 'idle' && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-card p-4 rounded-lg shadow-lg border flex items-center space-x-3">
                            <Spinner/>
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
