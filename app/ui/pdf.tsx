'use client';

import React, {useState, useRef, useCallback, useEffect, useMemo} from 'react';
import {DimensionScores} from "@/app/lib/content/scoring";
import {useContactStore, contactOverrideFromParams} from "@/app/lib/contact/contact-store";
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
import {ContactUnlockForm} from "@/app/ui/contact-unlock-form";

const PDF_FRAGMENTS = "#pagemode=none&navpanes=0&toolbar=0&view=Fit"

import { DvipdfmxEngine } from "@/app/lib/swiftlatex/DvipdfmxEngine";
import { XeTeXEngine } from "@/app/lib/swiftlatex/XeTeXEngine";
import { prewarmEngines } from "@/app/lib/swiftlatex-prewarm";

import {REVEAL_TEXT} from "@/app/lib/contact/contact-constants";

let xetexEngine: XeTeXEngine, dviEngine: DvipdfmxEngine;

// "Engines ready" = worker init + cache prewarm, as one idempotent promise
let enginesReadyPromise: Promise<void> | null = null;
export function warmEngines(): Promise<void> {
    if (!enginesReadyPromise) {
        enginesReadyPromise = (async () => {
            if (!xetexEngine) {
                xetexEngine = new XeTeXEngine();
                await xetexEngine.loadEngine("/lib/swiftlatex/swiftlatexxetex.js");
            }
            if (!dviEngine) {
                dviEngine = new DvipdfmxEngine();
                await dviEngine.loadEngine("/lib/swiftlatex/swiftlatexdvipdfm.js");
            }
            const t0 = performance.now();
            try {
                await prewarmEngines(xetexEngine, dviEngine);
                console.log(`Prewarm complete in ${(performance.now() - t0).toFixed(0)}ms`);
            } catch (e) {
                console.error('Prewarm failed (falling back to on-demand fetch):', e);
            }
        })().catch((e) => {
            enginesReadyPromise = null; // init failed — let a later attempt retry
            console.error("Engine initialization failed:", e);
            throw e;
        });
    }
    return enginesReadyPromise;
}

type RenderState = 'idle' | 'rendering';

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
    // Always-current contact for the compile to read. Keeping it out of the render deps means
    // the render callbacks stay stable, so the (single) trigger the parent captured never goes
    // stale after an unlock — every render path picks up the latest email/phone.
    const contactRef = useRef(contact);
    contactRef.current = contact;

    const [renderState, setRenderState] = useState<RenderState>('idle');
    const [pdfUrl, setPdfUrl] = useState("");
    const [error, setError] = useState<PdfError | null>(null);
    const [unlockOpen, setUnlockOpen] = useState(false);

    // renderingRef is the synchronous concurrency guard — a render is in flight iff it's true
    const renderingRef = useRef(false);
    // The single latest queued request. Rapid changes overwrite it (intermediates are skipped),
    // the in-flight render picks it up when it finishes
    const pendingWeightsRef = useRef<DimensionScores | null>(null);
    // Latest requested weights, so a contact change (unlock) or "Try Again" can re-render them
    const lastWeightsRef = useRef<DimensionScores | null>(null);
    // Current object URL, tracked so we can revoke the previous one instead of leaking it
    const pdfUrlRef = useRef<string>("");

    const publishPdf = useCallback((bytes: Uint8Array<ArrayBuffer>) => {
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = url;
        setPdfUrl(url);
    }, []);

    // One compile pass. Assumes the engines are ready; throws a PdfError on failure
    const compileOnce = useCallback(async (weights: DimensionScores) => {
        let latex: string;
        try {
            latex = generateResumeLatex(weights, contactRef.current);
        } catch (e) {
            throw { stage: 'latex-gen', message: 'Failed to generate LaTeX source', details: String(e) } as PdfError;
        }

        xetexEngine.writeMemFSFile("main.tex", latex);
        xetexEngine.setEngineMainFile("main.tex");
        const result = await xetexEngine.compileLaTeX();
        if (result.status !== 0) throw { stage: 'xetex', message: 'XeTeX compilation failed', details: result.log } as PdfError;
        if (!result.pdf) throw { stage: 'xetex', message: 'No XDV output from XeTeX', details: result.log } as PdfError;

        dviEngine.writeMemFSFile("main.xdv", result.pdf);
        dviEngine.setEngineMainFile("main.xdv");
        const pdfResult = await dviEngine.compilePDF();
        if (pdfResult.status !== 0) throw { stage: 'dvipdfmx', message: 'Dvipdfmx conversion failed', details: pdfResult.log } as PdfError;
        if (!pdfResult.pdf) throw { stage: 'dvipdfmx', message: 'No PDF output from Dvipdfmx', details: pdfResult.log } as PdfError;

        publishPdf(pdfResult.pdf);
    }, [publishPdf]);

    // Serialized render loop. Keeps working on the current request; while it runs, rapid
    // changes collapse to the single latest (pendingWeightsRef), which it renders next
    const runRenderLoop = useCallback(async (weights: DimensionScores) => {
        renderingRef.current = true;
        setRenderState('rendering');
        try {
            try {
                await warmEngines(); // usually already done by the page's on-load warm
            } catch (e) {
                setError({ stage: 'init', message: 'Failed to initialize LaTeX engines', details: String(e) });
                return;
            }
            // A change that arrived during warm-up (before any compile started) replaces the
            // original — skip straight to the latest. Once compiling, changes queue instead.
            let current: DimensionScores | null = pendingWeightsRef.current ?? weights;
            while (current) {
                pendingWeightsRef.current = null;
                setError(null);
                try {
                    await compileOnce(current);
                } catch (e) {
                    console.error('PDF generation failed:', e);
                    setError(e && typeof e === 'object' && 'stage' in e
                        ? e as PdfError
                        : { stage: 'unknown', message: 'An unexpected error occurred', details: String(e) });
                }
                current = pendingWeightsRef.current; // latest queued during this pass, if any
            }
        } finally {
            renderingRef.current = false;
            pendingWeightsRef.current = null;
            setRenderState('idle');
        }
    }, [compileOnce]);

    const triggerRender = useCallback((weights: DimensionScores) => {
        lastWeightsRef.current = weights; // remember the latest requested, for unlock / retry
        if (renderingRef.current) {
            pendingWeightsRef.current = weights; // collapse to latest, the loop will pick it up after current render
        } else {
            void runRenderLoop(weights);
        }
    }, [runRenderLoop]);

    // Register the trigger with the parent. triggerRender is stable: it reads refs (not state) so it never goes stale
    const hasRegisteredRef = useRef(false);
    useEffect(() => {
        if (!hasRegisteredRef.current && onWeightsComplete) {
            onWeightsComplete(triggerRender);
            hasRegisteredRef.current = true;
        }
    }, [onWeightsComplete, triggerRender]);

    // Re-render when the contact info actually changes (passphrase unlock)
    // Value-compare (not a one-shot flag) so StrictMode's double-invoke can't sneak a second fire; and the ref-based
    // guard means even if it did, it would just queue rather than run concurrently.
    const prevContactRef = useRef(contact);
    useEffect(() => {
        if (prevContactRef.current === contact) return;
        prevContactRef.current = contact;
        if (lastWeightsRef.current) triggerRender(lastWeightsRef.current);
    }, [contact, triggerRender]);

    // Revoke the last blob URL on unmount
    useEffect(() => () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); }, []);

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
                <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 mb-8">
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
                                <ContactUnlockForm onSuccess={() => setUnlockOpen(false)}/>
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
                        <Button
                            onClick={() => {
                                setError(null);
                                if (lastWeightsRef.current) triggerRender(lastWeightsRef.current);
                            }}
                            variant="outline"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
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
