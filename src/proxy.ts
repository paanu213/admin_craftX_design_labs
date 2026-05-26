import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

const adminOnlyRoutes = ["/settings"];

export const proxy = auth((req: NextAuthRequest) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublic = nextUrl.pathname === "/login";

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  const isAdminOnly = adminOnlyRoutes.some((r) =>
    nextUrl.pathname.startsWith(r)
  );
  if (isAdminOnly && (req.auth?.user?.role as string) !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
