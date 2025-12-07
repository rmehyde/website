// TODO: this is required to make SharedArrayBuffer work
//   on static site, we'll need to custom-set these headers

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const res = NextResponse.next();

    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return res;
}
