'use client'

import {Dimension, dimensionLabels, DimensionScores, dimensionScoresSchema, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState, useRef} from "react";
import PDFComponent from "@/app/ui/pdf";
import ProfileSelector from "@/app/ui/profiles";

export default function DynamicProjects() {
    // initialize weights to maxScore for each dimension
    const [values, setValues] = useState<Record<string, number>>(
        Dimension.options.reduce(
            (acc, dim) => ({...acc, [dim]: maxScore}),
            {}
        )
    );

    const triggerRenderRef = useRef<((weights: DimensionScores) => void) | null>(null);
    const previousWeightsRef = useRef<DimensionScores | null>(null);

    const handleWeightsComplete = (newValues: Record<string, number>) => {
        // Called when user releases pointer on RadialSelector
        const parsedWeights = dimensionScoresSchema.parse(newValues);

        // Check if weights actually changed
        const hasChanged = !previousWeightsRef.current || Object.keys(parsedWeights).some(
            key => parsedWeights[key as keyof DimensionScores] !== previousWeightsRef.current?.[key as keyof DimensionScores]
        );

        if (hasChanged) {
            previousWeightsRef.current = parsedWeights;
            triggerRenderRef.current?.(parsedWeights);
        }
    };

    const handlePDFReady = (triggerFn: (weights: DimensionScores) => void) => {
        // Called by PDFComponent to register its trigger function
        triggerRenderRef.current = triggerFn;

        // Trigger initial render when PDF component is ready
        const initialWeights = dimensionScoresSchema.parse(values);
        previousWeightsRef.current = initialWeights;
        triggerFn(initialWeights);
    };

    return (
        <div>
            {/*<div className="flex flex-col justify-center md:pl-8">*/}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                {/* TODO: fix scroll issue on mobile */}
                {/* radial selector drives the weights */}
                <ProfileSelector />
                <RadialSelector
                    dimensionLabels={dimensionLabels}
                    values={values}
                    levels={maxScore}
                    max={maxScore}
                    onChange={setValues}
                    onComplete={handleWeightsComplete}
                    plotRadius={100}  // TODO: should be 75 on mobile
                />
            </div>
            {/* TODO: probably this padding should be global as well */}
            <div className="pb-8">
                <PDFComponent
                    onWeightsComplete={handlePDFReady}
                />
            </div>
        </div>
    )
}
