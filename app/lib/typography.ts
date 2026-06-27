/**
 * The type scale — five notches, named by position (largest → smallest), not by function.
 * A given size serves several uses, so functional names lie; the scale is just sizes.
 *
 * Mobile-first: the unprefixed class is the phone size; it scales UP at the breakpoints.
 * The desktop end of each ramp reproduces the site's existing sizes EXACTLY — the only
 * new thing here is the smaller mobile end. Tune any notch in this one file.
 *
 * Weight is NOT part of the scale — apply font-* per element (e.g. cn(scale.lead, "font-medium")).
 *
 *   notch      mobile → desktop      where it currently lands
 *   splash     36 → 96   (4xl/8xl)   home hero
 *   headline   20 → 30   (xl/3xl)    home section links; projects prompts
 *   lead       18 → 24   (lg/2xl)    card titles; home intro; "Reese is a"
 *   body       16 → 20   (base/xl)   project descriptions (reading text; 16 = mobile floor)
 *   label      12 → 14   (xs/sm)     radial axis labels; small meta
 */
export const scale = {
    splash: "text-4xl sm:text-6xl lg:text-8xl",
    headline: "text-xl md:text-2xl lg:text-3xl",
    lead: "text-lg md:text-xl lg:text-2xl",
    nav: "text-sm sm:text-md md:text-lg lg:text-xl",
    body: "text-base md:text-lg lg:text-xl",
    label: "text-xs md:text-sm",
} as const;