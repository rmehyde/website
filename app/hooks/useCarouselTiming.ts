'use client'

// TODO: delete

import { useState, useEffect, useCallback, useRef } from 'react';

interface CarouselConfig {
  iterations: number;           // How many full cycles through all items  
  startDelayMs?: number;       // Delay between initial ticks
  endDelayMs?: number;         // Delay between final ticks
  easingPower?: number;        // How aggressive the slowdown is (2 = quadratic)
}

interface CarouselState {
  isRunning: boolean;
  currentIndex: number;
  progress: number;           // 0 to 1
  totalDuration: number;      // Calculated total duration
}

export function useCarouselTiming(
  itemCount: number,
  targetIndex: number,
  config: CarouselConfig
) {
  const [state, setState] = useState<CarouselState>({
    isRunning: false,
    currentIndex: 0,
    progress: 0,
    totalDuration: 0
  });

  const timeoutRef = useRef<number | null>(null);

  // Generate the complete sequence of transitions upfront
  const generateSequence = useCallback(() => {
    const {
      iterations,
      startDelayMs = 100,
      endDelayMs = 800,
      easingPower = 2
    } = config;

    // Work backwards: we want the LAST step to be targetIndex
    // If we have totalTicks steps, and we want step[totalTicks-1] to be targetIndex:
    // startIndex + (totalTicks - 1) ≡ targetIndex (mod itemCount)
    // So: startIndex = targetIndex - (totalTicks - 1)
    const totalTicks = iterations * itemCount;
    const rawStartIndex = targetIndex - (totalTicks - 1);
    const startIndex = ((rawStartIndex % itemCount) + itemCount) % itemCount; // Ensure positive
    
    const sequence: { index: number; delay: number }[] = [];
    let cumulativeTime = 0;

    for (let tick = 0; tick < totalTicks; tick++) {
      const index = (startIndex + tick) % itemCount;
      const progress = tick / Math.max(1, totalTicks - 1);
      
      // Ease from startDelay to endDelay
      const easedProgress = Math.pow(progress, easingPower);
      const delay = startDelayMs + (endDelayMs - startDelayMs) * easedProgress;
      
      sequence.push({
        index,
        delay: Math.round(delay)
      });
      
      cumulativeTime += delay;
    }

    // Verify the math worked (debug)
    const lastIndex = sequence[sequence.length - 1]?.index;
    console.log(`Carousel: target=${targetIndex}, totalTicks=${totalTicks}, startIndex=${startIndex}, lastIndex=${lastIndex}`);
    if (lastIndex !== targetIndex) {
      console.warn(`Carousel math error: expected to end at ${targetIndex}, but ending at ${lastIndex}`);
    }

    return { sequence, totalDuration: cumulativeTime };
  }, [itemCount, targetIndex, config]);

  const start = useCallback(() => {
    if (itemCount === 0) return;

    const { sequence, totalDuration } = generateSequence();
    setState(prev => ({ 
      ...prev, 
      isRunning: true, 
      totalDuration,
      currentIndex: sequence[0]?.index || targetIndex
    }));

    let currentStep = 0;

    const executeStep = () => {
      if (currentStep >= sequence.length) {
        setState(prev => ({
          ...prev,
          isRunning: false,
          currentIndex: targetIndex,
          progress: 1
        }));
        return;
      }

      const step = sequence[currentStep];

      setState(prev => ({
        ...prev,
        currentIndex: step.index,
        progress: currentStep / Math.max(1, sequence.length - 1)
      }));

      currentStep++;

      if (currentStep < sequence.length) {
        timeoutRef.current = window.setTimeout(executeStep, step.delay);
      } else {
        // Final state
        setState(prev => ({
          ...prev,
          isRunning: false,
          currentIndex: targetIndex,
          progress: 1
        }));
      }
    };

    executeStep();
  }, [itemCount, targetIndex, generateSequence]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentIndex: targetIndex,
      progress: 1
    }));
  }, [targetIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    start,
    stop
  };
}