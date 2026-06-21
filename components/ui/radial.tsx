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
import {scale} from "@/app/lib/typography";
import {useBreakpointUp} from "@/app/lib/tailwind/responsive";

type RadialSelectorProps = {
    dimensionLabels: Record<string, string>;
    values: Record<string, number>;
    max: number;
    levels: number; // number of concentric integer steps
    onChange: (newValues: Record<string, number>) => void;
    onComplete?: (finalValues: Record<string, number>) => void;
    labelTextClass?: string;
    minRadiusRatio?: number;
    // Transition props
    transitionDuration?: number; // if provided, enables smooth transitions
    onTransitionStart?: () => void;
    onTransitionEnd?: () => void;
};

export const RadialSelector: React.FC<RadialSelectorProps> = ({
                                                                  dimensionLabels,
                                                                  values,
                                                                  max,
                                                                  onChange,
                                                                  onComplete,
                                                                  labelTextClass = scale.label,
                                                                  minRadiusRatio = 0.1,
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

    // Component owns its sizing: two discrete sizes switched at the `md` breakpoint.
    // The whole geometry scales together (plot radius + label room + gutters) so the small
    // size actually fits a phone — not just the plot radius. Desktop = original tuned values,
    // mobile = half. Label *text* scales separately via labelTextClass (the type scale).
    const isMdUp = useBreakpointUp("md");
    const plotRadius = isMdUp ? 100 : 70;
    const labelSpaceX = 120;
    const labelSpaceY = 50;
    const labelDistance = 20;
    const gutterX = 20;
    const gutterY = 14;

    // box = plot + label room + gutter, sized per axis so it isn't forced square.
    // labels are bounded to the plot+label region (the gutter stays empty) — see the cap below.
    // NOTE: only width is capped; labelSpaceY must be chosen to fit the tallest top/bottom label.
    const usableHalfWidth = plotRadius + labelSpaceX;
    // `width` is the FULL box (plot + label room). The container requests it as a definite
    // width (so it WON'T collapse as a flex item — the SVG + labels are absolute, so there's no
    // in-flow content to give it size) but caps at max-width:100%, so it still shrinks when an
    // ancestor is narrower: the label room gives way (labels wrap) while the plot stays put.
    // `height` is fixed (vertical isn't viewport-constrained). The plot SVG is a fixed square,
    // centered; its coords are relative to plotSize, while labels anchor to the container.
    const width = (usableHalfWidth + gutterX) * 2;
    const height = (plotRadius + labelSpaceY + gutterY) * 2;
    const plotSize = (plotRadius + 8) * 2;
    const cx = plotSize / 2;
    const cy = plotSize / 2;
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
            className="relative mx-auto"
            style={{width, maxWidth: "100%", height}}
        >
            <svg
                ref={svgRef}
                width={plotSize}
                height={plotSize}
                className="touch-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
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
            {/* plot labels — HTML overlays positioned in the SVG's coordinate space */}
            {dimensions.map((dim, i) => {
                const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const anchorRadius = plotRadius + labelDistance * 0.8;
                // translate each label outward by a fraction of its own size
                const tx = -50 + 50 * cos;
                const ty = -50 + 50 * sin;

                // Cap label width to the room left between its anchor and the container edge,
                // as a calc() on the LIVE container width (100%): when the container shrinks
                // below `width`, the cap shrinks and the label wraps instead of spilling.
                // At full width this reduces to the old fixed-px cap.
                const horizontalReserve = 2 * gutterX + 2 * Math.abs(cos) * anchorRadius;
                const widthDivisor = 1 + Math.abs(cos);

                return (
                    <Label
                        key={dim}
                        style={{
                            position: "absolute",
                            left: `calc(50% + ${(cos * anchorRadius).toFixed(2)}px)`,
                            top: `${(height / 2 + sin * anchorRadius).toFixed(2)}px`,
                            transform: `translate(${tx}%, ${ty}%)`,
                            maxWidth: `calc((100% - ${horizontalReserve.toFixed(2)}px) / ${widthDivisor.toFixed(4)})`,
                            textAlign: "center",
                            overflowWrap: "break-word",
                        }}
                        className={labelTextClass + " font-medium"}
                    >
                        {dimensionLabels[dim]}
                    </Label>
                );
            })}
        </div>
    );
};
