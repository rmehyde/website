'use client'

import {useEffect, useRef, useState} from "react";
import {profiles} from "../lib/content/profiles";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ProfileSelector() {
    const first = profiles[0]?.name;

    const [value, setValue] = useState<string | undefined>(undefined);
    const [displayName, setDisplayName] = useState(first ?? "Choose a profile");
    const [introRunning, setIntroRunning] = useState(true);

    const timeoutRef = useRef<number | null>(null);
    const cancelledRef = useRef(false);

    const cancelIntro = () => {
        if (!introRunning) return;
        cancelledRef.current = true;
        if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setIntroRunning(false);
        if (first) setValue(first);
    };

    useEffect(() => {
        if (!first || profiles.length === 0) {
            setIntroRunning(false);
            return;
        }

        // respect reduced motion
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            setDisplayName(first);
            setValue(first);
            setIntroRunning(false);
            return;
        }

        cancelledRef.current = false;
        setIntroRunning(true);
        setValue(undefined);

        const n = profiles.length;
        const totalTicks = Math.max(18, Math.min(40, n * 3)); // tweak if you want longer/shorter
        let tick = 0;

        const step = () => {
            if (cancelledRef.current) return;

            setDisplayName(profiles[tick % n].name);
            tick += 1;

            if (tick >= totalTicks) {
                setDisplayName(first);
                setValue(first);
                setIntroRunning(false);
                return;
            }

            // ease-out: starts fast, slows down
            const t = tick / totalTicks;
            const delay = 35 + 220 * (t * t);

            timeoutRef.current = window.setTimeout(step, delay);
        };

        step();

        return () => {
            cancelledRef.current = true;
            if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        };
    }, [first]);

    return (
        <div className="flex flex-col gap-3 md:min-w-[240px]">
            <div className="text-lg font-medium">Reese is a</div>

            <Select
                value={value}
                onValueChange={(name) => {
                    cancelIntro();
                    setValue(name);
                }}
            >
                <SelectTrigger
                    className="w-full"
                    onPointerDownCapture={cancelIntro}
                    onKeyDownCapture={cancelIntro}
                >
                    <SelectValue placeholder={introRunning ? displayName : "Choose a profile"}/>
                </SelectTrigger>

                <SelectContent>
                    {profiles.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                            {p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
