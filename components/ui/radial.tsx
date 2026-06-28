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

    // Plot geometry lives in fixed SVG user units and scales to `--plot-r` screen
    // pixels via the viewBox, so the size is CSS-driven (no layout JS, no hydration jump).
    const PR = 100;                 // plot radius (user units)
    const PAD = 8;                  // room so handles/strokes aren't clipped
    const VB = (PR + PAD) * 2;      // viewBox edge
    const cx = VB / 2;
    const cy = VB / 2;
    const innerR = PR * minRadiusRatio;
    const handleR = 6;
    const handleHitR = 8;          // generous touch target; scales with the plot

    // Label placement, in screen px, applied around the live plot via calc().
    const labelRoomX = 144;         // horizontal text room reserved each side (wide enough for "Machine Learning" on one line)
    const labelRoomY = 56;          // vertical text room reserved top and bottom
    const edgeThreshold = 0.5;      // |cos| at or below this marks a top/bottom pole; the rest are side-anchored

    // Use displayValues for rendering (either current values or transitioning values)
    const dataPoints = dimensions.map((dim, i) => {
        const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
        const v = Math.max(0, Math.min(displayValues[dim] ?? 0, max));
        const radius = innerR + (PR - innerR) * (v / max);
        return {angle, radius};
    });

    const radialLineGen = lineRadial<{ angle: number; radius: number }>()
        .angle(d => d.angle + Math.PI / 2)
        .radius(d => d.radius)
        .curve(curveCardinalClosed.tension(0.5));

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
        // clamp projection to [innerR, PR]
        const clamped = Math.min(Math.max(proj, innerR), PR);
        // map to integer value in [0, max]
        const raw = ((clamped - innerR) / (PR - innerR)) * max;
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

    return (
        <div
            className="relative mx-auto [--plot-r:72px] [--label-gap:14px] md:[--plot-r:100px] md:[--label-gap:19px]"
            style={{
                width: `calc(2 * var(--plot-r) + ${2 * labelRoomX}px)`,
                maxWidth: "100%",
                height: `calc(2 * var(--plot-r) + ${2 * labelRoomY}px)`,
            }}
        >
            <svg
                ref={svgRef}
                viewBox={`0 0 ${VB} ${VB}`}
                style={{ width: `calc(var(--plot-r) * ${VB / PR})`, height: `calc(var(--plot-r) * ${VB / PR})` }}
                className="touch-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                {/* axes */}
                {dimensions.map((dim, i) => {
                    const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                    const x2 = cx + Math.cos(angle) * PR;
                    const y2 = cy + Math.sin(angle) * PR;
                    return (
                        <line
                            key={dim}
                            x1={cx}
                            y1={cy}
                            x2={x2}
                            y2={y2}
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
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
                            r={innerR + (PR - innerR) * t}
                            fill="none"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={0.5}
                            vectorEffect="non-scaling-stroke"
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
                        vectorEffect="non-scaling-stroke"
                    />
                </g>

                {/* draggable handles */}
                {dimensions.map((dim, i) => {
                    const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                    const v = Math.max(0, Math.min(displayValues[dim] ?? 0, max));
                    const r = innerR + (PR - innerR) * (v / max);
                    const ux = Math.cos(angle);
                    const uy = Math.sin(angle);
                    const hx = cx + ux * r;
                    const hy = cy + uy * r;
                    return (
                        <g key={dim}>
                            {/* invisible enlarged hit target — transparent fill is still hit-testable */}
                            <circle
                                cx={hx}
                                cy={hy}
                                r={handleHitR}
                                fill="transparent"
                                onPointerDown={onHandleDown(dim)}
                                style={{cursor: "pointer"}}
                            />
                            {/* visible dot — drawn on top, ignores pointers so the hit target catches them */}
                            <circle
                                cx={hx}
                                cy={hy}
                                r={handleR}
                                fill="hsl(var(--primary))"
                                stroke="hsl(var(--primary-foreground))"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                style={{pointerEvents: "none"}}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Labels: the top/bottom poles center above/below their dot; every other label
                is welded by its near horizontal edge and vertically centered on the dot, so
                text radiates outward and a wrapped label grows in place. */}
            {dimensions.map((dim, i) => {
                const angle = (i / dimensions.length) * 2 * Math.PI - Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const isPole = Math.abs(cos) <= edgeThreshold;

                // tx/ty weld a box edge to the anchor; gapX/gapY nudge it off the dot by a
                // multiple of --label-gap. Poles weld a horizontal edge and center; others weld
                // a side and ride their axis vertically (gapY ∝ sin), so flankers sit off-level.
                const tx = isPole ? -50 : cos > 0 ? 0 : -100;
                const ty = isPole ? (sin < 0 ? -100 : 0) : -50;
                const gapX = isPole ? 0 : cos > 0 ? 1 : -1;
                const gapY = sin;
                const textAlign = isPole ? "center" : cos > 0 ? "left" : "right";

                const left = `calc(50% + (${cos.toFixed(4)} * var(--plot-r)) + (${gapX} * var(--label-gap)))`;
                const top = `calc(50% + (${sin.toFixed(4)} * var(--plot-r)) + (${gapY.toFixed(4)} * var(--label-gap)))`;

                // Cap width to the live room between the anchor and the container edge so a
                // long label wraps instead of spilling; poles get the full width.
                const maxWidth = isPole
                    ? "100%"
                    : `calc(50% - var(--label-gap) - (${Math.abs(cos).toFixed(4)} * var(--plot-r)))`;

                return (
                    <Label
                        key={dim}
                        style={{
                            position: "absolute",
                            left,
                            top,
                            transform: `translate(${tx}%, ${ty}%)`,
                            maxWidth,
                            textAlign,
                            overflowWrap: "normal",
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
