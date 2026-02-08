'use client';

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {DimensionScores} from "@/app/lib/content/scoring";
import {useContactStore} from "@/app/contact/contactContext";
import {generateResumeLatex} from "@/app/lib/content/resume";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {Download, AlertCircle, RefreshCw, ChevronDownIcon} from "lucide-react";

const PDF_FRAGMENTS = "#pagemode=none&navpanes=0&toolbar=0&view=fitH"

import { DvipdfmxEngine } from "@/app/lib/swiftlatex/DvipdfmxEngine";
import { XeTeXEngine } from "@/app/lib/swiftlatex/XeTeXEngine";

let xetexEngine: XeTeXEngine, dviEngine: DvipdfmxEngine;

export const initializeLatexEngines = async () => {
    try {
        console.log("Initializing latex engines...");
        if (!xetexEngine) {
            xetexEngine = new XeTeXEngine();
        }
        if (!dviEngine) {
            dviEngine = new DvipdfmxEngine();
        }
        await xetexEngine.loadEngine("/lib/swiftlatex/swiftlatexxetex.js");
        await dviEngine.loadEngine("/lib/swiftlatex/swiftlatexdvipdfm.js");
        console.log("Engines loaded");
    } catch (e) {
        console.error("Engine initialization failed:", e);
        throw e;
    }
}

type RenderState = 'idle' | 'rendering' | 'pending';

interface PdfError {
    stage: 'init' | 'latex-gen' | 'xetex' | 'dvipdfmx' | 'unknown';
    message: string;
    details?: string;
}

export default function PDFComponent({onWeightsComplete}: {
    onWeightsComplete?: (callback: (weights: DimensionScores) => void) => void;
}) {
    const contact = useContactStore((state) => state.contact);
    const [renderState, setRenderState] = useState<RenderState>('idle');
    const [pdfUrl, setPdfUrl] = useState("");
    const [error, setError] = useState<PdfError | null>(null);
    const pendingWeightsRef = useRef<DimensionScores | null>(null);

    const renderPDF = useCallback(async (weightsToRender: DimensionScores) => {
        setRenderState('rendering');
        setError(null);
        pendingWeightsRef.current = null;

        try {
            // Engine initialization
            try {
                await initializeLatexEngines();
            } catch (e) {
                throw { stage: 'init', message: 'Failed to initialize LaTeX engines', details: String(e) };
            }

            if (!xetexEngine || !dviEngine) {
                throw { stage: 'init', message: 'Engines not initialized', details: 'xetexEngine or dviEngine is undefined' };
            }

            // LaTeX generation
            let latex: string;
            try {
                latex = await generateResumeLatex(weightsToRender, contact);
                console.log("LaTeX generated", latex);
            } catch (e) {
                throw { stage: 'latex-gen', message: 'Failed to generate LaTeX source', details: String(e) };
            }

            // XeTeX compilation
            xetexEngine.writeMemFSFile("main.tex", latex);
            xetexEngine.setEngineMainFile("main.tex");
            const result = await xetexEngine.compileLaTeX();

            if (result.status !== 0) {
                throw { stage: 'xetex', message: 'XeTeX compilation failed', details: result.log };
            }
            if (!result.pdf) {
                throw { stage: 'xetex', message: 'No XDV output from XeTeX', details: result.log };
            }

            // Dvipdfmx conversion
            dviEngine.writeMemFSFile("main.xdv", result.pdf);
            dviEngine.setEngineMainFile("main.xdv");

            const pdfResult = await dviEngine.compilePDF();

            if (pdfResult.status !== 0) {
                throw { stage: 'dvipdfmx', message: 'Dvipdfmx conversion failed', details: pdfResult.log };
            }
            if (!pdfResult.pdf) {
                throw { stage: 'dvipdfmx', message: 'No PDF output from Dvipdfmx', details: pdfResult.log };
            }

            // Success
            const pdfBlob = new Blob([pdfResult.pdf], {type: "application/pdf"});
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);

        } catch (e) {
            console.error('PDF generation failed:', e);
            if (e && typeof e === 'object' && 'stage' in e) {
                setError(e as PdfError);
            } else {
                setError({ stage: 'unknown', message: 'An unexpected error occurred', details: String(e) });
            }
        } finally {
            const pendingWeights = pendingWeightsRef.current;
            if (pendingWeights) {
                pendingWeightsRef.current = null;
                setRenderState('pending');
                setTimeout(() => renderPDF(pendingWeights), 0);
            } else {
                setRenderState('idle');
            }
        }
    }, [contact]);

    const triggerRender = useCallback((weightsToRender: DimensionScores) => {
        if (renderState === 'idle') {
            renderPDF(weightsToRender);
        } else {
            pendingWeightsRef.current = weightsToRender;
            if (renderState === 'rendering') {
                setRenderState('pending');
            }
        }
    }, [renderState, renderPDF]);

    const hasRegisteredRef = useRef(false);
    useEffect(() => {
        if (!hasRegisteredRef.current && onWeightsComplete) {
            onWeightsComplete(triggerRender);
            hasRegisteredRef.current = true;
        }
    }, [onWeightsComplete]);

    const stageLabels: Record<PdfError['stage'], string> = {
        'init': 'Engine Initialization',
        'latex-gen': 'LaTeX Generation',
        'xetex': 'XeTeX Compilation',
        'dvipdfmx': 'PDF Conversion',
        'unknown': 'Unknown Stage',
    };

    return (
        <div>
            <div className="flex justify-center mb-6">
                {(renderState !== 'idle') ? (
                    <Button disabled>
                        <Spinner/>
                        Generating PDF...
                    </Button>
                ) : error ? (
                    <Button onClick={() => setError(null)} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                ) : (
                    <Button asChild>
                        <a href={pdfUrl} download={`reesehyde-resume.pdf`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Resume
                        </a>
                    </Button>
                )}
            </div>

            <div className="relative">
                {error ? (
                    <div className="w-full min-h-[400px] p-6 bg-muted/30 rounded-lg">
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>PDF Generation Failed: {stageLabels[error.stage]}</AlertTitle>
                            <AlertDescription>
                                {error.message}
                                <div className="h-4"/>
                                {error.details && <ErrorDetailsCollapsible error={error}/>}
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : pdfUrl ? (
                    <object data={pdfUrl + PDF_FRAGMENTS}
                            type='application/pdf'
                            width='100%' height='1000px'>
                    </object>
                ) : (
                    <div className="w-full h-[1000px] bg-gray-300"></div>
                )}

                {renderState !== 'idle' && !error && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-card p-4 rounded-lg shadow-lg border flex items-center space-x-3">
                            <Spinner/>
                            <span className="text-sm font-medium">Generating PDF...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ErrorDetailsCollapsible({ error }: { error: { details?: string } }) {
    return (
        <Collapsible className="data-[state=open]:bg-transparent rounded-md">
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="group w-full justify-start hover:bg-transparent hover:underline px-0"
                >
                    Error Details
                    <ChevronDownIcon className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-2 pt-2">
        <pre className="overflow-x-auto rounded-md bg-black/10 p-3 text-xs">
          <code>{error.details}</code>
        </pre>
            </CollapsibleContent>
        </Collapsible>
    )
}
