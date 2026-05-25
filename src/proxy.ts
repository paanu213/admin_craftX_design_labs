import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login"];
const adminOnlyRoutes = ["/settings"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isPublic = publicRoutes.includes(nextUrl.pathname);

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  const isAdminOnly = adminOnlyRoutes.some((r) =>
    nextUrl.pathname.startsWith(r)
  );
  if (isAdminOnly && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
