'use client';

import React, {useState, useRef, useCallback, useEffect, useMemo} from 'react';
import {DimensionScores} from "@/app/lib/content/scoring";
import {useContactStore, contactOverrideFromParams} from "@/app/contact/contactContext";
import {generateResumeLatex} from "@/app/lib/content/resume";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {Download, AlertCircle, RefreshCw, ChevronDownIcon, Lock} from "lucide-react";
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {UnlockForm} from "@/app/contact/UnlockForm";

const PDF_FRAGMENTS = "#pagemode=none&navpanes=0&toolbar=0&view=Fit"

import { DvipdfmxEngine } from "@/app/lib/swiftlatex/DvipdfmxEngine";
import { XeTeXEngine } from "@/app/lib/swiftlatex/XeTeXEngine";
import {REVEAL_TEXT} from "@/app/contact/content";

let xetexEngine: XeTeXEngine, dviEngine: DvipdfmxEngine;

export const initializeLatexEngines = async () => {
    try {
        if (!xetexEngine) {
            xetexEngine = new XeTeXEngine();
            await xetexEngine.loadEngine("/lib/swiftlatex/swiftlatexxetex.js");
        }
        if (!dviEngine) {
            dviEngine = new DvipdfmxEngine();
            await dviEngine.loadEngine("/lib/swiftlatex/swiftlatexdvipdfm.js");
        }
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
    const storeContact = useContactStore((state) => state.contact);
    const locked = useContactStore((state) => state.locked);
    // Optional ?email=/?phone= URL overrides let us export a real-contact résumé for ATS without
    // unlocking. Read once from the URL, then merged over the (possibly masked) store values so
    // each field overrides independently and absent ones fall through to the store.
    const contactOverride = useMemo(
        () => (typeof window !== 'undefined'
            ? contactOverrideFromParams(new URLSearchParams(window.location.search))
            : {}),
        [],
    );
    const contact = useMemo(() => ({
        email: contactOverride.email ?? storeContact.email,
        phone: contactOverride.phone ?? storeContact.phone,
    }), [storeContact, contactOverride]);
    // Always-current contact for renderPDF to read. Keeping it out of renderPDF's deps means
    // renderPDF stays stable, so the (single) trigger the parent captured never goes stale after
    // an unlock — every render path picks up the latest email/phone.
    const contactRef = useRef(contact);
    contactRef.current = contact;
    const [renderState, setRenderState] = useState<RenderState>('idle');
    const [pdfUrl, setPdfUrl] = useState("");
    const [error, setError] = useState<PdfError | null>(null);
    const [unlockOpen, setUnlockOpen] = useState(false);
    const pendingWeightsRef = useRef<DimensionScores | null>(null);
    // Weights of the most recent render, so a contact change (unlock) can re-render with them.
    const lastWeightsRef = useRef<DimensionScores | null>(null);

    const renderPDF = useCallback(async (weightsToRender: DimensionScores) => {
        setRenderState('rendering');
        setError(null);
        pendingWeightsRef.current = null;
        lastWeightsRef.current = weightsToRender;

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
                latex = generateResumeLatex(weightsToRender, contactRef.current);
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
    }, []);

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

    // Re-render when the contact info actually changes (passphrase unlock) — the weights are
    // unchanged, so the weight-driven render path won't fire on its own. We compare against the
    // PREVIOUS contact value rather than using a one-shot "did mount" flag: React StrictMode
    // double-invokes mount effects in dev, and a one-shot flag would let the second invoke sneak
    // past and launch a second concurrent compile ("Engine is still spinning"). A value compare is
    // idempotent — it fires at most once per genuine change. Keyed on `contact` only; including
    // triggerRender would re-fire on every renderState change.
    const prevContactRef = useRef(contact);
    useEffect(() => {
        if (prevContactRef.current === contact) return;
        prevContactRef.current = contact;
        if (lastWeightsRef.current) {
            triggerRender(lastWeightsRef.current);
        }
    }, [contact]);

    const stageLabels: Record<PdfError['stage'], string> = {
        'init': 'Engine Initialization',
        'latex-gen': 'LaTeX Generation',
        'xetex': 'XeTeX Compilation',
        'dvipdfmx': 'PDF Conversion',
        'unknown': 'Unknown Stage',
    };

    return (
        <div>
            {(renderState === 'idle' && !error) ? (
                <div className="flex flex-wrap items-center justify-center gap-12 mb-8">
                    {locked && (
                        <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Lock className="mr-2 h-4 w-4"/>
                                    {REVEAL_TEXT}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader>
                                    <DialogTitle>{REVEAL_TEXT}</DialogTitle>
                                </DialogHeader>
                                <UnlockForm onSuccess={() => setUnlockOpen(false)}/>
                            </DialogContent>
                        </Dialog>
                    )}

                    <Button asChild>
                        <a href={pdfUrl} download={`reesehyde-resume.pdf`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Resume
                        </a>
                    </Button>
                </div>
            ) : (
                <div className="flex justify-center mb-8">
                    {renderState !== 'idle' ? (
                        <Button disabled>
                            <Spinner/>
                            Generating PDF...
                        </Button>
                    ) : (
                        <Button onClick={() => setError(null)} variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {/* TODO: state issue. Fail -> Try Again. Does nothing, you get "Download Resume" button */}
                            Try Again
                        </Button>
                    )}
                </div>
            )}

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
                ) : (
                    <div className="w-full aspect-[8.5/11]">
                        {/* aspect box = US Letter (8.5x11): the whole page shows with no internal
                            scroll, and height tracks width. Single-page only — a 2nd page would
                            reintroduce internal scroll. */}
                        {pdfUrl ? (
                            <object data={pdfUrl + PDF_FRAGMENTS}
                                    type='application/pdf'
                                    className="block h-full w-full">
                            </object>
                        ) : (
                            <div className="h-full w-full bg-gray-300"></div>
                        )}
                    </div>
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
