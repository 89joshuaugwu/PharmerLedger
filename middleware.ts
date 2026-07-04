import { NextResponse, type NextRequest } from "next/server";

// Route guard for /dashboard/*. Firebase Auth's client SDK stores its
// session in IndexedDB, not a cookie the edge middleware can read directly,
// so we check for the lightweight "pl_session" cookie set by the client
// right after a successful login (see lib/auth.ts + login page) as a
// fast redirect signal. The REAL authorization is enforced by
// firestore.rules + the AppShell's client-side onAuthStateChanged guard —
// this middleware is a UX convenience to avoid a flash of protected UI,
// not the security boundary itself.
export function middleware(request: NextRequest) {
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  if (!isDashboardRoute) return NextResponse.next();

  const session = request.cookies.get("pl_session");
  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
