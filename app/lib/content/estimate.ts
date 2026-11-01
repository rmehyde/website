import {Link} from "@/app/lib/content/schema";

// printed characters per full-width line of resume body text, for estimating wraps before compiling.
//   calibrated against real compiles: the longest one-line bullet is 94 chars, the shortest wrapped one 102.
export const CHARS_PER_LINE = 98

export function estimateLines(chars: number): number {
    return Math.ceil(chars / CHARS_PER_LINE)
}

// visible length of a concise link superscript: a space, then each "(tag)"
export function linkChars(links: Link[] | undefined): number {
    return (links ?? []).reduce((sum, link) => sum + 3 + link.tag.length, 0)
}

// the real page count, for checking the estimate: TeX ends its log with "Output written on main.xdv (2 pages, ...)".
//   null when that line is missing, which callers should treat as "assume it fit".
export function pageCountFromLog(log: string): number | null {
    const match = log.match(/Output written on [^(]*\((\d+) pages?/)
    return match ? Number(match[1]) : null
}
