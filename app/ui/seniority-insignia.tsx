import {Seniority} from "@/app/lib/content/profiles";
import {cn} from "@/components/lib/utils";

// Rank-style insignia drawn in a 24-unit-wide viewBox: chevrons point up, the rocker sags in the middle.
const BAND = 2.6;
const ARM_DROP = 7;
const CHEVRON_PITCH = 4.6;
const ROCKER_SAG = 5;
const ROCKER_GAP = 1.6;
const PAD = 1;

const INSIGNIA: Record<Seniority, { chevrons: number; rockers: number }> = {
    1: { chevrons: 1, rockers: 0 },
    2: { chevrons: 2, rockers: 0 },
    3: { chevrons: 3, rockers: 1 },
};

function insigniaHeight({ chevrons, rockers }: { chevrons: number; rockers: number }): number {
    const chevronsBottom = PAD + (chevrons - 1) * CHEVRON_PITCH + ARM_DROP + BAND;
    return (rockers ? chevronsBottom + ROCKER_GAP + BAND + ROCKER_SAG / 2 : chevronsBottom) + PAD;
}

// Every tier shares one viewBox, so icons line up and names start at the same x.
const VIEW_HEIGHT = insigniaHeight(INSIGNIA[3]);

interface SeniorityInsigniaProps {
    seniority?: Seniority;  // Omitted for the custom profile: renders an empty slot of the same size
    className?: string;
}

// Sized in em so it tracks the surrounding text across breakpoints.
export default function SeniorityInsignia({ seniority, className = "" }: SeniorityInsigniaProps) {
    const insignia = seniority && INSIGNIA[seniority];
    const top = insignia ? (VIEW_HEIGHT - insigniaHeight(insignia)) / 2 + PAD : 0;
    const rockerTop = insignia
        ? top + (insignia.chevrons - 1) * CHEVRON_PITCH + ARM_DROP + BAND + ROCKER_GAP
        : 0;

    return (
        <svg
            viewBox={`0 0 24 ${VIEW_HEIGHT}`}
            className={cn("h-[0.8em] w-auto shrink-0 fill-current text-muted-foreground", className)}
            {...(seniority ? { role: "img", "aria-label": `Seniority ${seniority} of 3` } : { "aria-hidden": true })}
        >
            {insignia && Array.from({ length: insignia.chevrons }, (_, i) => {
                const y = top + i * CHEVRON_PITCH;
                return (
                    <polygon
                        key={i}
                        points={`1,${y + ARM_DROP} 12,${y} 23,${y + ARM_DROP} 23,${y + ARM_DROP + BAND} 12,${y + BAND} 1,${y + ARM_DROP + BAND}`}
                    />
                );
            })}
            {insignia && insignia.rockers > 0 && (
                <path d={`M1,${rockerTop} Q12,${rockerTop + ROCKER_SAG} 23,${rockerTop} L23,${rockerTop + BAND} Q12,${rockerTop + ROCKER_SAG + BAND} 1,${rockerTop + BAND} Z`}/>
            )}
        </svg>
    );
}
