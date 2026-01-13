"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/components/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

// animated select

type AnimatedSelectCtx = {
    introRunning: boolean;
    displayValue: string | null;
    cancelIntro: (reason?: string) => void;
    slideDurationMs: number;
};

const AnimatedSelectContext = React.createContext<AnimatedSelectCtx | null>(null);

function useAnimatedSelectCtx() {
    return React.useContext(AnimatedSelectContext);
}

type AnimatedSelectProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
    introValues: string[];
    introTicks?: number;
    introEnabled?: boolean;
    slideDurationMs?: number;
};

const AnimatedSelect = ({
                            introValues,
                            introTicks,
                            introEnabled = true,
                            slideDurationMs = 160,
                            onOpenChange,
                            onValueChange,
                            children,
                            ...props
                        }: AnimatedSelectProps) => {
    const [introRunning, setIntroRunning] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState<string | null>(null);

    const valuesKey = React.useMemo(() => introValues.join("\u0000"), [introValues]);
    const valuesRef = React.useRef<string[]>(introValues);
    React.useEffect(() => {
        valuesRef.current = introValues;
    }, [valuesKey]);

    const timeoutRef = React.useRef<number | null>(null);
    const cancelledRef = React.useRef(false);
    const completedRef = React.useRef(false);
    const sawFirstValueChangeRef = React.useRef(false);

    const stopTimers = React.useCallback(() => {
        cancelledRef.current = true;
        if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }, []);

    const cancelIntro = React.useCallback(
        (_reason?: string) => {
            if (completedRef.current) return;
            completedRef.current = true;
            stopTimers();
            setIntroRunning(false);
            setDisplayValue(null);
        },
        [stopTimers]
    );

    React.useEffect(() => {
        if (!introEnabled) return;
        if (completedRef.current) return;

        const values = valuesRef.current.filter(Boolean);
        if (values.length === 0) return;

        if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            completedRef.current = true;
            setIntroRunning(false);
            setDisplayValue(null);
            return;
        }

        cancelledRef.current = false;
        setIntroRunning(true);

        const total = introTicks ?? Math.max(18, Math.min(60, values.length * 4));
        let tick = 0;

        const step = () => {
            if (cancelledRef.current) return;

            setDisplayValue(values[tick % values.length]);
            tick += 1;

            if (tick >= total) {
                completedRef.current = true;
                setIntroRunning(false);
                setDisplayValue(null);
                return;
            }

            // ease-out but never faster than the slide can animate
            const t = tick / total;
            const minDelay = slideDurationMs + 30;
            const delay = Math.max(minDelay, 35 + 220 * (t * t));

            timeoutRef.current = window.setTimeout(step, delay);
        };

        step();

        return () => {
            stopTimers();
        };
    }, [introEnabled, introTicks, valuesKey, stopTimers, slideDurationMs]);

    const handleOpenChange = React.useCallback(
        (open: boolean) => {
            if (open) cancelIntro("onOpenChange(open=true)");
            onOpenChange?.(open);
        },
        [cancelIntro, onOpenChange]
    );

    const handleValueChange = React.useCallback(
        (value: string) => {
            if (!sawFirstValueChangeRef.current) {
                sawFirstValueChangeRef.current = true;
                onValueChange?.(value);
                return;
            }
            cancelIntro(`onValueChange(${value})`);
            onValueChange?.(value);
        },
        [cancelIntro, onValueChange]
    );

    const ctx: AnimatedSelectCtx = React.useMemo(
        () => ({ introRunning, displayValue, cancelIntro, slideDurationMs }),
        [introRunning, displayValue, cancelIntro, slideDurationMs]
    );

    return (
        <AnimatedSelectContext.Provider value={ctx}>
            <SelectPrimitive.Root
                {...props}
                onOpenChange={handleOpenChange}
                onValueChange={handleValueChange}
            >
                {children}
            </SelectPrimitive.Root>
        </AnimatedSelectContext.Provider>
    );
};

const AnimatedSelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, onPointerDownCapture, onKeyDownCapture, ...props }, ref) => {
    const ctx = useAnimatedSelectCtx();

    const [prevLabel, setPrevLabel] = React.useState<string>("");
    const [nextLabel, setNextLabel] = React.useState<string>("");
    const [sliding, setSliding] = React.useState(false);
    const [noTransition, setNoTransition] = React.useState(false);

    const slideTimerRef = React.useRef<number | null>(null);
    const animatingRef = React.useRef(false);
    const pendingRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (!ctx?.introRunning) {
            if (slideTimerRef.current != null) window.clearTimeout(slideTimerRef.current);
            slideTimerRef.current = null;

            animatingRef.current = false;
            pendingRef.current = null;

            setSliding(false);
            setNoTransition(false);
            setPrevLabel("");
            setNextLabel("");
            return;
        }

        const v = ctx.displayValue;
        if (!v) return;

        if (!prevLabel) {
            setPrevLabel(v);
            setNextLabel(v);
            setSliding(false);
            setNoTransition(false);
            return;
        }

        if (animatingRef.current) {
            pendingRef.current = v;
            return;
        }

        const durationMs = ctx?.slideDurationMs ?? 160;

        const startSlide = (next: string) => {
            animatingRef.current = true;

            setNextLabel(next);
            setNoTransition(false);
            setSliding(true);

            if (slideTimerRef.current != null) window.clearTimeout(slideTimerRef.current);

            slideTimerRef.current = window.setTimeout(() => {
                setNoTransition(true);
                setSliding(false);
                setPrevLabel(next);

                requestAnimationFrame(() => setNoTransition(false));

                animatingRef.current = false;
                slideTimerRef.current = null;

                const pending = pendingRef.current;
                pendingRef.current = null;

                if (pending && pending !== next && ctx.introRunning) {
                    setTimeout(() => startSlide(pending), 0);
                }
            }, durationMs);
        };

        if (v === nextLabel) return;

        startSlide(v);
    }, [ctx?.introRunning, ctx?.displayValue, ctx?.slideDurationMs, prevLabel, nextLabel]);

    const shownPrev = prevLabel || nextLabel || "";

    return (
        <SelectTrigger
            ref={ref}
            className={cn(
                "relative",
                ctx?.introRunning && "[&>span]:opacity-0",
                className
            )}
            onPointerDownCapture={(e) => {
                ctx?.cancelIntro("trigger pointerdown");
                onPointerDownCapture?.(e);
            }}
            onKeyDownCapture={(e) => {
                ctx?.cancelIntro("trigger keydown");
                onKeyDownCapture?.(e);
            }}
            {...props}
        >
            {children}

            {ctx?.introRunning ? (
                <div className="pointer-events-none absolute left-3 right-8 top-1/2 -translate-y-1/2 text-sm">
                    <div className="block h-5 overflow-hidden">
                        <div
                            className={cn(
                                "flex flex-col",
                                noTransition ? "transition-none" : "transition-transform duration-150 ease-out",
                                sliding ? "-translate-y-full" : "translate-y-0"
                            )}
                        >
                            <div className="h-5 leading-5 line-clamp-1">{shownPrev}</div>
                            <div className="h-5 leading-5 line-clamp-1">{nextLabel || shownPrev}</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </SelectTrigger>
    );
});
AnimatedSelectTrigger.displayName = "AnimatedSelectTrigger";


export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  AnimatedSelect,
  AnimatedSelectTrigger,
}
