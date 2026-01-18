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

export default function ProfileSelector() {
    return (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="text-2xl whitespace-nowrap">Reese is a</div>
            <Select defaultValue={profiles[0]?.name}>
                <SelectTrigger className="w-full text-xl gap-1">
                    <SelectValue placeholder="Choose a profile"/>
                </SelectTrigger>

                <SelectContent>
                    {profiles.map((p) => (
                        <SelectItem key={p.name} value={p.name} className="text-xl">
                            {p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
