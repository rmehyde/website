'use client';

import { useContext, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DimensionScores } from '@/app/lib/content/scoring';
import { ContactContext } from '@/app/contact/contactContext';
import { generateResumeLatex } from '@/app/lib/content/resume';
import {
    initializeLatexEngines,
    compileLatex,
    revokeCompiledPdfUrl,
} from '@/app/lib/latexengines';

export default function PDFComponent({ weights }: { weights: DimensionScores }) {
    const { contact } = useContext(ContactContext);
    const [busy, setBusy]    = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const controllerRef      = useRef<AbortController>();

    // init engines once
    useEffect(() => {
        initializeLatexEngines().catch(console.error);
    }, []);

    // rebuild on weights/contact change
    useEffect(() => {
        // cancel previous
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const { signal } = controller;

        let active = true;

        async function build() {
            setBusy(true);
            if (pdfUrl) {
                revokeCompiledPdfUrl(pdfUrl);
                setPdfUrl('');
            }

            try {
                const latex = await generateResumeLatex(weights, contact);
                const url   = await compileLatex(latex, signal);
                if (active && !signal.aborted) {
                    setPdfUrl(url);
                } else {
                    revokeCompiledPdfUrl(url);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('PDF generation error:', err);
                }
            } finally {
                if (active) {
                    setBusy(false);
                }
            }
        }

        build();
        return () => {
            active = false;
            controller.abort();
        };
    }, [weights, contact]);

    return (
        <div>
            <div className="relative mx-auto" style={{ width: 'fit-content' }}>
                <Button disabled>
                    {busy ? 'Compiling…' : 'Up to date'}
                </Button>
            </div>
            <div className="h-8 w-full" />
            {pdfUrl && (
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    width="100%"
                    height="1000px"
                />
            )}
        </div>
    );
}
