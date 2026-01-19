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

export default function ProfileSelector() {
    const [mode, setMode] = useState<Mode>('intro');
    const [selectedProfile, setSelectedProfile] = useState<string>(profiles[0]?.name || '');
    const [previewProfile, setPreviewProfile] = useState<string>(profiles[0]?.name || '');
    const [isAnimating, setIsAnimating] = useState(false);

    // Find the target profile index (where we want to end up)
    const targetIndex = profiles.findIndex(p => p.name === selectedProfile);

    // Generate the timing and sequence data
    const generateAnimationData = () => {
        const iterations = 5;
        const startDelayMs = 50;
        const endDelayMs = 250;
        const easingPower = 2.2;
        
        // Calculate total steps and sequence
        const totalSteps = iterations * profiles.length;
        const startIndex = (targetIndex - totalSteps + profiles.length * 100) % profiles.length;
        
        const sequence: string[] = [];
        const timings: { profileName: string; cumulativeTime: number; stepIndex: number }[] = [];
        
        let cumulativeTime = 0;
        
        // Build sequence and calculate exact timing for each step
        for (let i = 0; i <= totalSteps; i++) { // Include final position
            const profileIndex = (startIndex + i) % profiles.length;
            const profileName = profiles[profileIndex]?.name || '';
            
            sequence.push(profileName);
            timings.push({
                profileName,
                cumulativeTime,
                stepIndex: i
            });
            
            // Calculate delay for NEXT step (if not the last step)
            if (i < totalSteps) {
                const progress = i / Math.max(1, totalSteps - 1);
                const easedProgress = Math.pow(progress, easingPower);
                const delay = startDelayMs + (endDelayMs - startDelayMs) * easedProgress;
                cumulativeTime += delay;
            }
        }
        
        const finalStepDuration = endDelayMs * 1.5;
        const totalDuration = cumulativeTime + finalStepDuration;
        
        // Convert to animation keyframes
        const keyframes = timings.map(({ cumulativeTime, stepIndex }) => ({
            transform: `translateY(-${100 * stepIndex / (totalSteps+0.5)}%)`,
            offset: totalDuration > 0 ? cumulativeTime / totalDuration : 0
        }));
        
        // Add the "roll back" keyframe at the very end
        // TODO: this doesn't look very good, needs tuning
        keyframes.push({
            transform: `translateY(-${100 * (totalSteps - 0.5) / (totalSteps + 0.5)}%)`, // Roll back half step
            offset: 1.0 // Final keyframe at end of animation
        });

        console.log(keyframes);
        return { sequence, keyframes, totalDuration, timings };
    };
    
    const animationData = useMemo(() => generateAnimationData(), [targetIndex]);
    const animationRef = useRef<HTMLDivElement>(null);

    // Start animation when component mounts
    useEffect(() => {
        if (mode === 'intro' && animationRef.current) {
            setIsAnimating(true);
            
            console.log('Starting animation with keyframes:', animationData.keyframes);
            console.log('Total duration:', animationData.totalDuration);
            
            // Log first few keyframes for debugging
            console.log('First 5 keyframes:');
            animationData.keyframes.slice(0, 5).forEach((kf, i) => {
                console.log(`Step ${i}: ${kf.transform} at offset ${kf.offset.toFixed(4)} (${(kf.offset * animationData.totalDuration).toFixed(0)}ms)`);
            });
            
            // Set up discrete preview profile updates
            const timeouts: NodeJS.Timeout[] = [];
            
            // Set initial preview profile
            setPreviewProfile(animationData.sequence[0] || selectedProfile);
            
            // Schedule updates for each timing step
            // TODO: these don't quite line up right, need to be tuned
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
                    easing: 'ease-out', // We handle easing in keyframe spacing
                    fill: 'forwards'
                }
            );
            
            // Complete animation and switch mode
            animation.onfinish = () => {
                setIsAnimating(false);
                setMode('interactive');
                setPreviewProfile(selectedProfile); // Sync preview to selected
                console.log(`Intro complete, selected: ${selectedProfile}`);
            };
            
            return () => {
                animation.cancel();
                timeouts.forEach(timeout => clearTimeout(timeout));
            };
        }
    }, [mode, selectedProfile, animationData]);

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
                                    className="flex flex-col gap-1.5 absolute top-1.5 left-0 w-full"
                                >
                                    {animationData.sequence.map((profileName, index) => (
                                        <div key={index} className="h-full leading-6 flex items-center flex-shrink-0 whitespace-nowrap">
                                            {profileName}
                                        </div>
                                    ))}
                                    <div className="h-0.45" />
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
                    Sequence length: {animationData.sequence.length} | Duration: {animationData.totalDuration}ms
                </div>
            </div>
        </div>
    );
}
