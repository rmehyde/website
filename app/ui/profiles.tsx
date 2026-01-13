'use client'

import { profiles } from "../lib/content/profiles";
import {
    AnimatedSelect, AnimatedSelectTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Dimension, dimensionLabels} from "@/app/lib/content/scoring";

export default function ProfileSelector() {
    return (
        <div className="flex flex-col gap-3 md:min-w-[240px]">
            <div className="text-2xl">Reese is a</div>
            <AnimatedSelect
                introValues={profiles.map((p) => p.name)}
                defaultValue={profiles[0]?.name}
                introTicks={Dimension.options.length * 3}
            >
                <AnimatedSelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a profile" />
                </AnimatedSelectTrigger>

                <SelectContent>
                    {profiles.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                            {p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </AnimatedSelect>
        </div>
    );
}
