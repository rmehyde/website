'use client'

import {Dimension, dimensionLabels, DimensionScores, dimensionScoresSchema, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState, useRef} from "react";
import PDFComponent from "@/app/ui/pdf";
import ProfileSelector from "@/app/ui/profiles-wheel";
import {profiles} from '@/app/lib/content/profiles';

type Mode = 'intro' | 'interactive';

export default function DynamicResume() {
    // Page-level state management
    const [mode, setMode] = useState<Mode>('intro');
    
    // Committed state - the authoritative weights
    const [committedWeights, setCommittedWeights] = useState<Record<string, number>>(
        profiles.find(p => p.name === "Machine Learning Engineer")?.scores || 
        Dimension.options.reduce((acc, dim) => ({...acc, [dim]: maxScore}), {})
    );
    
    // Preview state - only used during intro
    const [previewWeights, setPreviewWeights] = useState<Record<string, number>>(committedWeights);
    
    // Profile states
    const [selectedProfile, setSelectedProfile] = useState<string>("Machine Learning Engineer");
    const [previewProfile, setPreviewProfile] = useState<string>("Machine Learning Engineer");

    const triggerRenderRef = useRef<((weights: DimensionScores) => void) | null>(null);
    const previousWeightsRef = useRef<DimensionScores | null>(null);

    // Exit intro mode and transition to interactive
    const exitIntro = (reason: 'auto' | 'user') => {
        console.log(`Exiting intro mode: ${reason}`);
        setMode('interactive');
        setPreviewProfile(selectedProfile);
        setPreviewWeights(committedWeights);
        
        // Trigger PDF generation for committed state if ready
        if (triggerRenderRef.current) {
            const parsedWeights = dimensionScoresSchema.parse(committedWeights);
            previousWeightsRef.current = parsedWeights;
            triggerRenderRef.current(parsedWeights);
        }
    };
    
    const handleWeightsComplete = (newValues: Record<string, number>) => {
        // Called when user releases pointer on RadialSelector
        // This should exit intro if we're still in it
        if (mode === 'intro') {
            exitIntro('user');
        }
        
        const parsedWeights = dimensionScoresSchema.parse(newValues);
        setCommittedWeights(newValues);

        // Check if weights actually changed
        const hasChanged = !previousWeightsRef.current || Object.keys(parsedWeights).some(
            key => parsedWeights[key as keyof DimensionScores] !== previousWeightsRef.current?.[key as keyof DimensionScores]
        );

        if (hasChanged && mode === 'interactive') {
            previousWeightsRef.current = parsedWeights;
            triggerRenderRef.current?.(parsedWeights);
        }
    };

    const handlePDFReady = (triggerFn: (weights: DimensionScores) => void) => {
        // Called by PDFComponent to register its trigger function
        triggerRenderRef.current = triggerFn;

        // Only trigger initial render if we're in interactive mode
        if (mode === 'interactive') {
            const initialWeights = dimensionScoresSchema.parse(committedWeights);
            previousWeightsRef.current = initialWeights;
            triggerFn(initialWeights);
        }
    };
    
    // Handle preview profile changes during intro animation
    const handlePreviewProfileChange = (profileName: string) => {
        setPreviewProfile(profileName);
        
        // Update preview weights to match the preview profile with smooth transition
        const profile = profiles.find(p => p.name === profileName);
        if (profile && mode === 'intro') {
            setPreviewWeights(profile.scores);
        }
    };
    
    // Callbacks for ProfileSelector
    const handleProfileSelection = (profileName: string) => {
        setSelectedProfile(profileName);
        const profile = profiles.find(p => p.name === profileName);
        if (profile) {
            setCommittedWeights(profile.scores);
            
            // Update radial selector immediately
            setValues(profile.scores);
            
            // Trigger PDF generation if in interactive mode
            if (mode === 'interactive' && triggerRenderRef.current) {
                const parsedWeights = dimensionScoresSchema.parse(profile.scores);
                previousWeightsRef.current = parsedWeights;
                triggerRenderRef.current(parsedWeights);
            }
        }
    };
    
    // For backwards compatibility
    const [values, setValues] = useState<Record<string, number>>(committedWeights);

    return (
        <div>
            {/*<div className="flex flex-col justify-center md:pl-8">*/}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <ProfileSelector 
                    mode={mode}
                    selectedProfile={selectedProfile}
                    previewProfile={previewProfile}
                    onProfileChange={handleProfileSelection}
                    onPreviewChange={handlePreviewProfileChange}
                    previewChangeOffsetMillis={-25}
                    onUserIntent={exitIntro}
                    onIntroComplete={() => exitIntro('auto')}
                />
                {/* TODO: fix scroll issue on mobile */}
                {/* radial selector drives the weights */}
                <RadialSelector
                    dimensionLabels={dimensionLabels}
                    values={mode === 'intro' ? previewWeights : values}
                    levels={maxScore}
                    max={maxScore}
                    onChange={setValues}
                    onComplete={handleWeightsComplete}
                    plotRadius={100}  // TODO: should be 75 on mobile
                    transitionDuration={mode === 'intro' ? 50 : undefined}
                />
            </div>
            {/* TODO: probably this padding should be global as well */}
            <div className="pb-8">
                {mode === 'interactive' && (
                    <PDFComponent
                        onWeightsComplete={handlePDFReady}
                    />
                )}
            </div>
        </div>
    )
}
