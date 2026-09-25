import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/tickets", "/assets", "/units", "/meters", "/users", "/categories", "/docs", "/settings", "/audit"];

/**
 * Optimistic auth gate: redirects to /login when no session cookie is present.
 * Full session validation (DB lookup, role checks) happens in server components/actions.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has("bsd_session");
  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|r/|track/|report).*)"],
};
