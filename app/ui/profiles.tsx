'use client'

import { profiles } from "../lib/content/profiles";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ProfileSelector() {
    return (
        <div className="flex flex-col gap-3 md:min-w-[240px]">
            <div className="text-2xl">Reese is a</div>

            <Select defaultValue={profiles[0]?.name}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a profile" />
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
