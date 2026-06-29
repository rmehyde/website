// Sets the COOP/COEP headers required for SharedArrayBuffer (needed by the SwiftLaTeX WASM).
// TODO: for a fully static deploy we'll need to set these headers another way (CDN/host config).
// (Next 16 renamed the `middleware` file convention to `proxy`.)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
    const res = NextResponse.next();

    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return res;
}
