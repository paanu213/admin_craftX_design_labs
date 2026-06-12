import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic cookie-presence check only — NO JWT decoding, NO DB calls.
// next-auth v5 uses "__Secure-authjs.session-token" on https and
// "authjs.session-token" on http. Checking both handles all envs.
// Full JWT verification + group-permission fetch lives in (dashboard)/layout.tsx.
export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const isPublic = nextUrl.pathname === "/login";

  const isLoggedIn =
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("authjs.session-token");

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
