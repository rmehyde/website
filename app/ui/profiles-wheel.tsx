'use client'

import {profiles as defaultProfiles, Profile, CUSTOM_PROFILE_NAME} from "../lib/content/profiles";
import {
    Select,
    SelectContent, SelectGroup,
    SelectItem, SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Dimension, dimensionLabels} from "@/app/lib/content/scoring";
import { useState, useEffect, useRef, useMemo } from "react";
import {ArrowRight} from "lucide-react";

type Mode = 'intro' | 'interactive';

interface ProfileSelectorProps {
    mode: Mode;
    selectedProfile: string;
    profiles?: Profile[];  // Optional, falls back to default profiles
    prefersReducedMotion?: boolean; // Skip animations if user prefers reduced motion
    onProfileChange: (profileName: string) => void;
    onPreviewChange: (profileName: string) => void;
    previewChangeOffsetMillis: number;
    onUserIntent: (reason: 'user') => void;
    onIntroComplete: () => void;
}

export default function ProfileSelector({ 
    mode, 
    selectedProfile,
    profiles = defaultProfiles,
    prefersReducedMotion = false,
    onProfileChange, 
    onPreviewChange,
    previewChangeOffsetMillis,
    onUserIntent,
    onIntroComplete,
}: ProfileSelectorProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    // TODO: there's some weird empty state: initial page load shows first element with no top margin which is wrong
    //  what we should be doing is setting this to null at the beginning but hiding the content until we can properly set the margin
    const [centeringOffset, setCenteringOffset] = useState(5);

    // Animation constants
    const iterations = 4;
    const startDelayMs = 100;
    const endDelayMs = 350;
    const easingPower = 2.2;

    // Find the target profile index (where we want to end up)
    const targetIndex = profiles.findIndex(p => p.name === selectedProfile);

    // Generate sequence for rendering elements
    const profileSequence = useMemo(() => {
        const startIndex = (targetIndex - 1 + profiles.length) % profiles.length;
        const sequence: string[] = [];
        
        // Add iterations worth of profiles
        for (let i = 0; i < iterations * profiles.length; i++) {
            const profileIndex = (startIndex + i) % profiles.length;
            const profileName = profiles[profileIndex]?.name || '';
            sequence.push(profileName);
        }
        
        // Add final target element
        sequence.push(profiles[targetIndex]?.name || '');
        
        return sequence;
    }, [targetIndex, iterations, profiles]);
    const animationRef = useRef<HTMLDivElement>(null);


    // Start animation when component mounts (unless motion is reduced)
    useEffect(() => {
        if (mode === 'intro' && animationRef.current && !prefersReducedMotion) {
            setIsAnimating(true);

            // generate animation positions and timings
            const generateAnimationData = (rowSizePx: number) => {
                let cumulativeTime = 0;
                
                // Build timing for each forward step
                const mainTimings: { profileName: string; cumulativeTime: number; stepIndex: number }[] = [];
                for (let i = 0; i < profileSequence.length; i++) {
                    mainTimings.push({
                        profileName: profileSequence[i],
                        cumulativeTime,
                        stepIndex: i
                    });
                    
                    // Calculate delay for next step (if not the last step)
                    if (i < profileSequence.length - 1) {
                        const progress = i / Math.max(1, profileSequence.length - 2);
                        const easedProgress = Math.pow(progress, easingPower);
                        const delay = startDelayMs + (endDelayMs - startDelayMs) * easedProgress;
                        cumulativeTime += delay;
                    }
                }
                
                // Rock effect
                // TODO: needs some tuning
                const rockSteps = 0;
                const rockDistance = .6; // row heights to overshoot
                const rockForwardStartSpeed = rockDistance / endDelayMs; // rows per ms
                const rockInflectionSpeed = rockForwardStartSpeed / 4; // rows per ms
                const rockBackEndSpeed = rockInflectionSpeed * 3; // rows per ms
                const rockEasingPower = 2;

                const lastStepIndex = profileSequence.length - 1;
                const rockTimings: { travelDistanceInRows: number; cumulativeTime: number;}[] = [];
                // Rock forward (overshoot)
                const forwardStepDistance = rockDistance / rockSteps;
                for (let i = 1; i <= rockSteps; i++) {
                    const progress = i / rockSteps;
                    const easedProgress = Math.pow(progress, rockEasingPower); // ease-in curve
                    const stepSpeed = rockForwardStartSpeed + (easedProgress * (rockInflectionSpeed - rockForwardStartSpeed));
                    const stepDuration = forwardStepDistance / stepSpeed; // distance / speed = time

                    cumulativeTime += stepDuration;
                    rockTimings.push({
                        travelDistanceInRows: i * forwardStepDistance, // cumulative distance
                        cumulativeTime,
                    });
                }
                // Rock back (settle to target)
                const backStepDistance = rockDistance / rockSteps;
                for (let i = 1; i <= rockSteps; i++) {
                    const progress = i / rockSteps;
                    const easedProgress = 1 - Math.pow(1 - progress, rockEasingPower); // ease-out curve
                    const stepSpeed = rockInflectionSpeed + (easedProgress * (rockBackEndSpeed - rockInflectionSpeed)); // slow down dramatically
                    const stepDuration = backStepDistance / stepSpeed; // distance / speed = time
                    
                    cumulativeTime += stepDuration;
                    const remainingDistance = rockDistance * (1 - progress); // linear decrease from rockDistance to 0
                    rockTimings.push({
                        travelDistanceInRows: remainingDistance,
                        cumulativeTime,
                    });
                }
                
                // Convert to animation keyframes
                const totalDuration = cumulativeTime;
                const keyframes = mainTimings.map(({ cumulativeTime, stepIndex }) => ({
                    transform: `translateY(-${stepIndex * rowSizePx}px)`,
                    offset: totalDuration > 0 ? cumulativeTime / totalDuration : 0
                }));
                for (const rt of rockTimings) {
                    console.log("rt ", rt);
                    keyframes.push({
                        transform: `translateY(-${(lastStepIndex + rt.travelDistanceInRows) * rowSizePx}px)`,
                        offset: totalDuration > 0 ? rt.cumulativeTime / totalDuration : 0
                    })
                }

                return { keyframes, totalDuration, timings: mainTimings };
            };

            // Get overflow container height to calculate top gap required to center text
            const overflowContainer = animationRef.current.parentElement;
            const buttonHeight = overflowContainer?.getBoundingClientRect().height || 0;
            const textElementHeight = animationRef.current.children[0]?.getBoundingClientRect().height || 0;
            const centeringOffsetPx = (buttonHeight - textElementHeight) / 2;

            // Calculate size of row from scroll content
            const containerHeight = animationRef.current.scrollHeight;
            const elementHeight = animationRef.current.children[0]?.getBoundingClientRect().height || 0;
            const gapHeight = elementHeight > 0 ? (containerHeight - (animationRef.current.children.length * elementHeight)) / (animationRef.current.children.length - 1) : 0;

            // Set padding after measurements
            setCenteringOffset(centeringOffsetPx);
            
            const animationData = generateAnimationData(elementHeight + gapHeight);
            
            console.log('Starting animation with keyframes:', animationData.keyframes);
            console.log('Total duration:', animationData.totalDuration);
            console.log("Animation data: ", animationData);
            
            // Set up discrete preview profile updates
            const timeouts: NodeJS.Timeout[] = [];
            
            // Set initial preview profile
            onPreviewChange(profileSequence[0] || selectedProfile);
            
            // Schedule updates for each timing step
            animationData.timings.forEach((timing) => {
                const timeout = setTimeout(() => {
                    onPreviewChange(timing.profileName);
                }, timing.cumulativeTime + previewChangeOffsetMillis);
                timeouts.push(timeout);
            });
            
            // Start the Web Animations API animation
            const animation = animationRef.current.animate(
                animationData.keyframes,
                {
                    duration: animationData.totalDuration,
                    easing: 'linear',
                    fill: 'forwards'
                }
            );

            // Complete animation and switch mode
            animation.onfinish = () => {
                setIsAnimating(false);
                onIntroComplete();
                console.log(`Intro complete, selected: ${selectedProfile}`);
            };
            
            return () => {
                animation.cancel();
                timeouts.forEach(timeout => clearTimeout(timeout));
            };
        } else if (mode === 'intro' && prefersReducedMotion) {
            // Skip animation entirely for reduced motion users
            onIntroComplete();
        }
    }, [mode, prefersReducedMotion]);

    const handleSelectChange = (value: string) => {
        onProfileChange(value);
        console.log(`Selected: ${value}`);
    };
    
    const handleUserIntent = () => {
        if (mode === 'intro') {
            onUserIntent('user');
        }
    };

    return (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {/* TODO: needs to switch to an on some */}
            <div className="text-2xl whitespace-nowrap">Reese is a</div>
            <div className="relative w-72">
                <Select value={selectedProfile} onValueChange={handleSelectChange}>
                    <SelectTrigger 
                        className={`w-full text-xl gap-1 py-0 overflow-hidden ${
                            selectedProfile === CUSTOM_PROFILE_NAME && !isAnimating ? 'text-muted-foreground' : ''
                        }`}
                        onPointerDown={handleUserIntent}
                        onKeyDown={handleUserIntent}
                        aria-label={`Current profile: ${selectedProfile}`}
                    >
                        {mode === 'intro' ? (
                            <>
                                {/* Stable content for screen readers */}
                                <span className="sr-only">
                                    Loading profile selector. Current profile: {selectedProfile}
                                </span>
                                
                                {/* Visual animated content - hidden from screen readers */}
                                <div 
                                    className="flex-1 overflow-hidden relative h-full"
                                    aria-hidden="true"
                                >
                                    <div
                                        ref={animationRef}
                                        className="flex flex-col gap-2 absolute left-0 w-full"
                                        style={{ marginTop: `${centeringOffset}px` }}
                                    >
                                        {profileSequence.map((profileName, index) => (
                                            <div key={index} className="h-full leading-6 flex items-center flex-shrink-0 whitespace-nowrap">
                                                {profileName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <SelectValue placeholder="Choose a profile"/>
                        )}
                    </SelectTrigger>

                    <SelectContent>
                        {profiles.filter(p => p.name !== CUSTOM_PROFILE_NAME).map((p) => (
                            <SelectItem key={p.name} value={p.name} className="text-xl">
                                {p.name}
                            </SelectItem>
                        ))}
                        <SelectSeparator />
                        {/* TODO small bug: when you load the page with non-profile, the text window is greyed out since the "final value" has disabled style */}
                        <SelectGroup>
                            <SelectItem
                                key={CUSTOM_PROFILE_NAME}
                                value={CUSTOM_PROFILE_NAME}
                                className="text-xl"
                                disabled
                            >
                                {CUSTOM_PROFILE_NAME}
                            </SelectItem>
                            <SelectLabel className="text-xs text-muted-foreground font-normal -mt-2 flex items-center gap-1">
                                Customize graph
                            </SelectLabel>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
