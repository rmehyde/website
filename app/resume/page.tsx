'use client'

import {Dimension, dimensionLabels, DimensionScores, dimensionScoresSchema, maxScore, dimensionScoresToParams, dimensionScoresFromParams} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState, useRef, useEffect} from "react";
import PDFComponent from "@/app/ui/pdf";
import ProfileSelector from "@/app/ui/profiles-wheel";
import {profiles, Profile, CUSTOM_PROFILE_NAME} from '@/app/lib/content/profiles';

type Mode = 'intro' | 'interactive';

const DEFAULT_PROFILE_NAME = "ML Platform Engineer";

// Helper function to find matching profile for given weights
const findMatchingProfile = (weights: Record<string, number>) => {
    return profiles.find(profile => {
        return Object.keys(weights).every(key => 
            profile.scores[key as keyof DimensionScores] === weights[key]
        );
    });
};

// Helper to get initial weights from URL or default profile
const getInitialWeights = (): Record<string, number> => {
    if (typeof window === 'undefined') {
        // Server-side: use default profile
        return profiles.find(p => p.name === DEFAULT_PROFILE_NAME)?.scores ||
               Dimension.options.reduce((acc, dim) => ({...acc, [dim]: maxScore}), {});
    }
    
    // Client-side: check URL params
    const params = new URLSearchParams(window.location.search);
    const urlWeights = dimensionScoresFromParams(params);
    
    if (Object.keys(urlWeights).length > 0) {
        // Found weights in URL - merge with defaults for missing dimensions
        const defaultWeights = Dimension.options.reduce((acc, dim) => ({...acc, [dim]: 0}), {});
        return { ...defaultWeights, ...urlWeights };
    }
    
    // No URL params: use default profile
    return profiles.find(p => p.name === DEFAULT_PROFILE_NAME)?.scores ||
           Dimension.options.reduce((acc, dim) => ({...acc, [dim]: maxScore}), {});
};

export default function DynamicResume() {
    // Check for reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    
    // Page-level state management - skip intro if motion is reduced
    const [mode, setMode] = useState<Mode>(prefersReducedMotion ? 'interactive' : 'intro');
    
    // Committed state - the authoritative weights
    const [committedWeights, setCommittedWeights] = useState<Record<string, number>>(getInitialWeights());
    
    // Preview state - only used during intro
    const [previewWeights, setPreviewWeights] = useState<Record<string, number>>(committedWeights);
    
    // Helper to get initial profile from weights
    const getInitialProfile = (weights: Record<string, number>): string => {
        const matchingProfile = findMatchingProfile(weights);
        return matchingProfile ? matchingProfile.name : CUSTOM_PROFILE_NAME;
    };
    
    // Profile states
    const [selectedProfile, setSelectedProfile] = useState<string>(getInitialProfile(committedWeights));
    const [previewProfile, setPreviewProfile] = useState<string>(getInitialProfile(committedWeights));

    const triggerRenderRef = useRef<((weights: DimensionScores) => void) | null>(null);
    const previousWeightsRef = useRef<DimensionScores | null>(null);
    
    // Update URL when weights change (debounced to avoid excessive updates)
    useEffect(() => {
        if (typeof window === 'undefined' || mode === 'intro') return;
        
        const timeoutId = setTimeout(() => {
            const params = dimensionScoresToParams(committedWeights as DimensionScores);
            const newUrl = params.toString() 
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
                
            window.history.replaceState({}, '', newUrl);
        }, 500); // 500ms debounce
        
        return () => clearTimeout(timeoutId);
    }, [committedWeights, mode]);

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
        
        // Detect if new weights match any existing profile
        const matchingProfile = findMatchingProfile(newValues);
        if (matchingProfile) {
            setSelectedProfile(matchingProfile.name);
        } else {
            setSelectedProfile(CUSTOM_PROFILE_NAME);
        }

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
        const profile = extendedProfiles.find(p => p.name === profileName);
        if (profile && mode === 'intro') {
            setPreviewWeights(profile.scores);
        }
    };
    
    // Create extended profiles list including custom option
    const extendedProfiles: Profile[] = [
        ...profiles,
        { 
            name: CUSTOM_PROFILE_NAME, 
            scores: Dimension.options.reduce((acc, dim) => ({...acc, [dim]: maxScore}), {} as Record<string, number>) as any
        }
    ];

    // Callbacks for ProfileSelector
    const handleProfileSelection = (profileName: string) => {
        setSelectedProfile(profileName);
        
        // Only apply profile weights if it's not a custom profile
        if (profileName !== CUSTOM_PROFILE_NAME) {
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
        }
        // For custom profiles, don't change the weights - user has set them manually
    };
    
    // For backwards compatibility
    const [values, setValues] = useState<Record<string, number>>(committedWeights);
    
    // Handle real-time weight changes during dragging to update profile preview
    const handleWeightsChange = (newValues: Record<string, number>) => {
        setValues(newValues);
        
        // In interactive mode, detect if weights match any profile
        if (mode === 'interactive') {
            const matchingProfile = findMatchingProfile(newValues);
            if (matchingProfile) {
                setSelectedProfile(matchingProfile.name);
            } else {
                setSelectedProfile(CUSTOM_PROFILE_NAME);
            }
        }
    };

    return (
        <div>
            {/*<div className="flex flex-col justify-center md:pl-8">*/}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <ProfileSelector
                    mode={mode}
                    selectedProfile={selectedProfile}
                    previewProfile={previewProfile}
                    profiles={extendedProfiles}
                    prefersReducedMotion={prefersReducedMotion}
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
                    onChange={handleWeightsChange}
                    onComplete={handleWeightsComplete}
                    plotRadius={100}  // TODO: should be 75 on mobile
                    transitionDuration={mode === 'intro' && !prefersReducedMotion ? 50 : undefined}
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
