import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight optimistic check — NO DB calls allowed here.
// Full session validation (with DB group query) happens in (dashboard)/layout.tsx.
// Using getToken instead of auth(handler) to avoid triggering the JWT callback
// which makes a DB query and can cause the post-login redirect loop.
export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const isPublic = nextUrl.pathname === "/login";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  const isLoggedIn = !!token;

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
