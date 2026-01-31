'use client'

// TODO: delete

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/components/lib/utils";

interface AnimatedTextProps {
  text: string;
  className?: string;
  duration?: number;
  onAnimationComplete?: () => void;
}

export function AnimatedText({ text, className, duration = 150, onAnimationComplete }: AnimatedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (text === displayText) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsAnimating(true);
    
    timeoutRef.current = window.setTimeout(() => {
      setDisplayText(text);
      setIsAnimating(false);
      onAnimationComplete?.();
    }, duration);

  }, [text, displayText, duration, onAnimationComplete]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden h-full", className)}>
      {/* Current text - slides up when animating */}
      <div 
        className="h-full flex items-center transition-transform duration-150 ease-out"
        style={{
          transform: isAnimating ? 'translateY(-100%)' : 'translateY(0)'
        }}
      >
        {displayText}
      </div>
      
      {/* New text slides in from bottom */}
      {isAnimating && (
        <div 
          className="absolute inset-0 h-full flex items-center"
          style={{
            transform: 'translateY(100%)',
            transition: `transform ${duration}ms ease-out`,
          }}
          ref={(el) => {
            if (el) {
              // Force reflow to ensure transition works
              el.offsetHeight;
              el.style.transform = 'translateY(0)';
            }
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}