import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/status"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const basePath = "/eldes";

  // Only process routes under /eldes
  if (!pathname.startsWith(basePath)) {
    return NextResponse.next();
  }

  // Remove base path for route checking
  const pathWithoutBase = pathname.replace(basePath, "") || "/";

  // Allow public routes
  if (publicRoutes.some((route) => pathWithoutBase.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie (read from request cookies, not cookies() API in middleware)
  const encryptedSession = request.cookies.get("eldes_session")?.value;
  
  if (!encryptedSession) {
    // Only log redirects (important events), not every request
    console.log(`[Middleware] No session cookie, redirecting to login from ${pathname}`);
    const loginUrl = new URL(`${basePath}/login`, request.url);
    // Use pathWithoutBase (without /eldes prefix) since Next.js will add basePath automatically
    // Only add redirect parameter if it's not the root path
    // Remove leading slash and replace internal slashes with double underscore (__) to avoid URL encoding
    if (pathWithoutBase !== "/") {
      const redirectPath = pathWithoutBase.startsWith("/") 
        ? pathWithoutBase.slice(1) 
        : pathWithoutBase;
      // Replace / with __ (double underscore) which is URL-safe and unlikely to conflict with paths
      const cleanPath = redirectPath.replace(/\//g, "__");
      loginUrl.searchParams.set("redirect", cleanPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists - let the API routes verify it's valid
  // Middleware just checks for presence, detailed validation happens in API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all /eldes paths except for static files
     */
    "/eldes/:path*",
    "/((?!_next/static|_next/image|favicon.ico|assets).*)",
  ],
};

