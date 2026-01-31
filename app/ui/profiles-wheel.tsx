'use client'

import { profiles } from "../lib/content/profiles";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Dimension, dimensionLabels} from "@/app/lib/content/scoring";
import { useState, useEffect, useRef, useMemo } from "react";

type Mode = 'intro' | 'interactive';

interface ProfileSelectorProps {
    defaultProfileName?: string;
}

export default function ProfileSelector({ defaultProfileName = profiles[0]?.name || '' }: ProfileSelectorProps) {
    const [mode, setMode] = useState<Mode>('intro');
    const [selectedProfile, setSelectedProfile] = useState<string>(defaultProfileName);
    const [previewProfile, setPreviewProfile] = useState<string>(defaultProfileName);
    const [isAnimating, setIsAnimating] = useState(false);

    // Animation constants
    const iterations = 4;
    const startDelayMs = 100;
    const endDelayMs = 350;
    const easingPower = 2.2;

    // Find the target profile index (where we want to end up)
    const targetIndex = profiles.findIndex(p => p.name === defaultProfileName);

    // Generate sequence for rendering elements
    const generateProfileNameSequence = () => {
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
    };

    const profileSequence = useMemo(() => generateProfileNameSequence(), [targetIndex]);
    const animationRef = useRef<HTMLDivElement>(null);

    // generate animation positions and timings
    const generateAnimationData = (containerHeight: number, elementHeight: number, gapHeight: number) => {
        const totalSteps = iterations * profiles.length;
        const timings: { profileName: string; cumulativeTime: number; stepIndex: number }[] = [];
        
        let cumulativeTime = 0;
        
        // Build timing for each step (matches sequence generation)
        for (let i = 0; i < profileSequence.length; i++) {
            timings.push({
                profileName: profileSequence[i],
                cumulativeTime,
                stepIndex: i
            });
            
            // Calculate delay for NEXT step (if not the last step)
            if (i < profileSequence.length - 1) {
                const progress = i / Math.max(1, profileSequence.length - 2);
                const easedProgress = Math.pow(progress, easingPower);
                const delay = startDelayMs + (endDelayMs - startDelayMs) * easedProgress;
                cumulativeTime += delay;
            }
        }
        
        const totalDuration = cumulativeTime;
        
        // Convert to animation keyframes
        const rowSize = (elementHeight + gapHeight) / containerHeight;
        console.log("actual row size, estimated row size", rowSize, 1 / totalSteps);
        const keyframes = timings.map(({ cumulativeTime, stepIndex }) => ({
            transform: `translateY(-${100 * stepIndex * rowSize}%)`,
            offset: totalDuration > 0 ? cumulativeTime / totalDuration : 0
        }));

        return { keyframes, totalDuration, timings };
    };

    // Start animation when component mounts
    useEffect(() => {
        if (mode === 'intro' && animationRef.current) {
            setIsAnimating(true);
            
            // Calculate real measurements
            const containerHeight = animationRef.current.scrollHeight;
            const elementHeight = animationRef.current.children[0]?.getBoundingClientRect().height || 0;
            const gapHeight = elementHeight > 0 ? (containerHeight - (animationRef.current.children.length * elementHeight)) / (animationRef.current.children.length - 1) : 0;
            
            const animationData = generateAnimationData(containerHeight, elementHeight, gapHeight);
            
            console.log('Starting animation with keyframes:', animationData.keyframes);
            console.log('Total duration:', animationData.totalDuration);
            console.log("Animation data: ", animationData);
            
            // Set up discrete preview profile updates
            const timeouts: NodeJS.Timeout[] = [];
            
            // Set initial preview profile
            setPreviewProfile(profileSequence[0] || selectedProfile);
            
            // Schedule updates for each timing step
            animationData.timings.forEach((timing) => {
                const timeout = setTimeout(() => {
                    setPreviewProfile(timing.profileName);
                    console.log(`Preview updated to: ${timing.profileName} at ${timing.cumulativeTime}ms`);
                }, timing.cumulativeTime);
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
                setMode('interactive');
                setPreviewProfile(selectedProfile);
                console.log(`Intro complete, selected: ${selectedProfile}`);
            };
            
            return () => {
                animation.cancel();
                timeouts.forEach(timeout => clearTimeout(timeout));
            };
        }
    }, [mode]);

    const handleSelectChange = (value: string) => {
        setSelectedProfile(value);
        console.log(`Selected: ${value}`);
    };

    return (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="text-2xl whitespace-nowrap">Reese is a</div>
            <div className="relative w-72">
                <Select value={selectedProfile} onValueChange={handleSelectChange}>
                    <SelectTrigger className="w-full text-xl gap-1 py-0 overflow-hidden">
                        {mode === 'intro' ? (
                            <div className="flex-1 overflow-hidden relative h-full">
                                <div
                                    ref={animationRef}
                                    className="flex flex-col gap-2 absolute top-2 left-0 w-full"
                                >
                                    {profileSequence.map((profileName, index) => (
                                        <div key={index} className="h-full leading-6 flex items-center flex-shrink-0 whitespace-nowrap">
                                            {profileName}
                                        </div>
                                    ))}
                                    {/*<div className="h-0.45" />*/}
                                </div>
                            </div>
                        ) : (
                            <SelectValue placeholder="Choose a profile"/>
                        )}
                    </SelectTrigger>

                    <SelectContent>
                        {profiles.map((p) => (
                            <SelectItem key={p.name} value={p.name} className="text-xl">
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {/* Debug info */}
                <div className="absolute top-full left-0 mt-1 text-xs text-gray-500 whitespace-nowrap">
                    Mode: {mode} | Animating: {isAnimating ? 'Yes' : 'No'}
                    <br />
                    Selected: {selectedProfile} | Preview: {previewProfile}
                    <br />
                    Sequence length: {profileSequence.length}
                </div>
            </div>
        </div>
    );
}
