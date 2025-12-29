// useBreak

"use client";

import { useEffect, useMemo, useState } from "react";
import { screens, type ScreenKey } from "./screens";

function asMinWidthQuery(value: string) {
    // screens values are usually like "768px"
    return `(min-width: ${value})`;
}

export function useBreakpointUp(key: ScreenKey) {
    const query = useMemo(() => asMinWidthQuery(screens[key]), [key]);
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);

        onChange(); // initial
        mql.addEventListener?.("change", onChange) ?? mql.addListener(onChange);

        return () => {
            mql.removeEventListener?.("change", onChange) ?? mql.removeListener(onChange);
        };
    }, [query]);

    return matches;
}
