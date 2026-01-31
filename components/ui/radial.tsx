import {
    lineRadial,
    curveLinear,
    curveLinearClosed,
    curveCardinalClosed,
    curveCatmullRomClosed,
    curveBundle,
} from "d3-shape";
import { transition } from "d3-transition";
import { interpolate } from "d3-interpolate";
import { easeCubicOut } from "d3-ease";
import React, {useState, useRef, useEffect, useCallback} from "react";
import {Card} from "@/components/ui/card";
import {Label} from "@/components/ui/label";

type RadialSelectorProps = {
    dimensionLabels: Record<string, string>;
    values: Record<string, number>;
    max: number;
    levels: number; // number of concentric integer steps
    onChange: (newValues: Record<string, number>) => void;
    onComplete?: (finalValues: Record<string, number>) => void;
    plotRadius?: number;
    labelTextClass?: string;
    minRadiusRatio?: number;
    labelDistance?: number;
    labelSpace?: number;
    // Transition props
    transitionDuration?: number; // if provided, enables smooth transitions
    onTransitionStart?: () => void;
    onTransitionEnd?: () => void;
};

function splitLines(text: string, maxLen: number): string[] {
    // split by words, including symbol-only words with the next (e.g. "& Thing" is a single element)
    const raw = text.split(" ");
    const words: string[] = [];
    for (let i = 0; i < raw.length; i++) {
        if (/^[^A-Za-z0-9]+$/.test(raw[i]) && i + 1 < raw.length) {
            // symbol-only token → merge with next
            words.push(raw[i] + " " + raw[i + 1]);
            i++;
        } else {
            words.push(raw[i]);
        }
    }

    // split into array of lines
    const result: string[] = [];
    let curLine = "";
    let lineLen = 0;
    for (const word of words) {
        lineLen += word.length + 1;
        if (lineLen <= maxLen) {
            curLine += curLine.length > 0 ? " " + word : word
        } else {
            result.push(curLine)
            curLine = word;
            lineLen = word.length + 1;
        }
    }
    result.push(curLine);

    return result;
}


export const RadialSelector: React.FC<RadialSelectorProps> = ({
                                                                  dimensionLabels,
                                                                  values,
                                                                  max,
                                                                  onChange,
                                                                  onComplete,
                                                                  plotRadius = 150,
                                                                  labelTextClass = "text-sm",
                                                                  minRadiusRatio = 0.1,
                                                                  labelDistance = 20,
    // TODO: consider replacing labelSpace with bbox-based dynamic rerender
                                                                  labelSpace = 110,
                                                                  transitionDuration,
                                                                  onTransitionStart,
                                                                  onTransitionEnd,
                                                              }) => {
    const [activeDim, setActiveDim] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    
    // Transition state management
    const [displayValues, setDisplayValues] = useState<Record<string, number>>(values);
    const transitionRef = useRef<any>(null);
    
    // Transition animation function using D3
    const startTransition = useCallback((fromValues: Record<string, number>, toValues: Record<string, number>) => {
        if (!transitionDuration || transitionDuration <= 0) {
            // No transition - set immediately
            setDisplayValues(toValues);
            return;
        }
        
        // Cancel any existing transition by setting a flag
        if (transitionRef.current) {
            transitionRef.current.cancelled = true;
        }
        
        onTransitionStart?.();
        
        // Create interpolator for the values object
        const valuesInterpolator = interpolate(fromValues, toValues);
        
        // Create transition state object
        const transitionState = { cancelled: false };
        transitionRef.current = transitionState;
        
        // Create D3 transition
        const t = transition()
            .duration(transitionDuration)
            .ease(easeCubicOut);
            
        // Apply the transition
        t.tween('values', () => {
            return (progress: number) => {
                // Check if this transition was cancelled
                if (transitionState.cancelled) return;
                
                setDisplayValues(valuesInterpolator(progress));
            };
        }).on('end', () => {
            if (!transitionState.cancelled) {
                transitionRef.current = null;
                setDisplayValues(toValues); // Ensure exact final values
                onTransitionEnd?.();
            }
        });
    }, [transitionDuration, onTransitionStart, onTransitionEnd]);
    
    // Cancel any active transition
    const cancelTransition = useCallback(() => {
        if (transitionRef.current) {
            transitionRef.current.cancelled = true;
            transitionRef.current = null;
        }
    }, []);
    
    // Detect when values prop changes and start transition
    useEffect(() => {
        if (transitionDuration && transitionDuration > 0) {
            startTransition(displayValues, values);
        } else {
            setDisplayValues(values);
        }
    }, [values, transitionDuration, startTransition, displayValues]);

    const dimensions = Object.keys(dimensionLabels);
    const dimensionLabelLines: Record<string, string[]> = Object.fromEntries(
        Object.entries(dimensionLabels).map(
            ([key, label]) => [key, splitLines(label, 17)]
        )
    );
    // total svg size includes extra space for labels
    const total = (plotRadius + labelSpace) * 2;
    const cx = total / 2;
    const cy = total / 2;
    const innerR = plotRadius * minRadiusRatio;
    const handleR = 6

    // Use displayValues for rendering (either current values or transitioning values)
    const dataPoints = dimensions.map((dim, i) => {
        const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
        const v = Math.max(0, Math.min(displayValues[dim] ?? 0, max));
        const radius = innerR + (plotRadius - innerR) * (v / max);
        return {angle, radius};
    });

    const radialLineGen = lineRadial<{ angle: number; radius: number }>()
        .angle(d => d.angle + Math.PI / 2)
        .radius(d => d.radius)
        // .curve(curveLinearClosed);
        .curve(curveCardinalClosed.tension(0.5));
    // .curve(curveCatmullRomClosed.alpha(0.1));

    // pointer down begins drag
    const onHandleDown = (dim: string) => (e: React.PointerEvent) => {
        // Cancel any ongoing transition when user starts interacting
        cancelTransition();
        // Snap displayValues to current values prop immediately
        setDisplayValues(values);
        
        e.currentTarget.setPointerCapture(e.pointerId);
        setActiveDim(dim);
    };

    // pointer move projects pointer onto radial line
    const onPointerMove = (e: React.PointerEvent) => {
        if (!activeDim || !svgRef.current) return;
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const inv = svgRef.current.getScreenCTM()?.inverse();
        if (!inv) return;
        const loc = pt.matrixTransform(inv);
        const idx = dimensions.indexOf(activeDim);
        const angle = (idx / dimensions.length) * 2 * Math.PI - Math.PI / 2;
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const dx = loc.x - cx;
        const dy = loc.y - cy;
        // project pointer onto axis
        const proj = dx * ux + dy * uy;
        // clamp projection to [innerR, plotRadius]
        const clamped = Math.min(Math.max(proj, innerR), plotRadius);
        // map to integer value in [0, max]
        const raw = ((clamped - innerR) / (plotRadius - innerR)) * max;
        const newVal = Math.round(raw);
        onChange({...values, [activeDim]: newVal});
    };

    // pointer up ends drag
    const onPointerUp = (e: React.PointerEvent) => {
        if (activeDim) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setActiveDim(null);
            // Call onComplete with final values when user releases
            onComplete?.(values);
        }
    };

    // @ts-ignore
    // @ts-ignore
    return (
        <div
            className="relative"
            style={{width: total, height: total}}
        >
            <svg
                ref={svgRef}
                width={total}
                height={total}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                {/* axes */}
                {dimensions.map((dim, i) => {
                    const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                    const x2 = cx + Math.cos(angle) * plotRadius;
                    const y2 = cy + Math.sin(angle) * plotRadius;
                    return (
                        <line
                            key={dim}
                            x1={cx}
                            y1={cy}
                            x2={x2}
                            y2={y2}
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1}
                        />
                    );
                })}

                {/* concentric integer-level circles */}
                {Array.from({ length: max + 1 }, (_, lvl) => {
                    const t = lvl / max;
                    return (
                        <circle
                            key={lvl}
                            cx={cx}
                            cy={cy}
                            r={innerR + (plotRadius - innerR) * t}
                            fill="none"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={0.5}
                        />
                    );
                })}

                {/* connecting shape */}
                <g transform={`translate(${cx}, ${cy})`}>
                    <path
                        d={radialLineGen(dataPoints)!}
                        fill="hsl(var(--primary) / 0.2)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                </g>

                {/* draggable handles */}
                {dimensions.map((dim, i) => {
                    const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                    const v = Math.max(0, Math.min(displayValues[dim] ?? 0, max));
                    const r = innerR + (plotRadius - innerR) * (v / max);
                    const ux = Math.cos(angle);
                    const uy = Math.sin(angle);
                    const hx = cx + ux * r;
                    const hy = cy + uy * r;
                    return (
                        <circle
                            key={dim}
                            cx={hx}
                            cy={hy}
                            r={handleR}
                            fill="hsl(var(--primary))"
                            stroke="hsl(var(--primary-foreground))"
                            strokeWidth={2}
                            onPointerDown={onHandleDown(dim)}
                            style={{cursor: "pointer"}}
                        />
                    );
                })}
            </svg>
            {/* plot labels */}
            {dimensions.map((dim, i) => {
                // compute the same label anchor point you used before
                const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                const lx = cx + Math.cos(angle) * (plotRadius + labelDistance * 0.8);
                const ly = cy + Math.sin(angle) * (plotRadius + labelDistance * 0.8);
                const tx = -50 + 50 * Math.cos(angle);
                const ty = -50 + 50 * Math.sin(angle);

                return (
                    <Label
                        key={dim}
                        style={{
                            position: "absolute",
                            left: `${lx}px`,
                            top: `${ly}px`,
                            transform: `translate(${tx}%, ${ty}%)`,
                            textAlign: "center",
                            whiteSpace: "nowrap",  // let <br/> drive line breaks
                        }}
                        className={labelTextClass + " font-medium"}
                    >
                        {dimensionLabelLines[dim].map((line, idx) => (
                            <React.Fragment key={idx}>
                                {line}
                                {idx < dimensionLabelLines[dim].length - 1 && <br/>}
                            </React.Fragment>
                        ))}
                    </Label>
                );
            })}
        </div>
    );
};
