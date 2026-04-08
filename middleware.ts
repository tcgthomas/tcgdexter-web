import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root middleware — runs on every request matching the config below.
 *
 * Currently just refreshes the Supabase session cookie. Does not gate routes.
 * Route-level protection is handled by individual server components via redirect().
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes — middleware doesn't need to refresh sessions for these)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * The remaining paths (pages, /d/, /account, /sign-in, etc.) will run
     * the middleware and get session refresh.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
