import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/auth/verify",
  "/api/gemini/playwright",
  "/api/database",
];

// Add your Chrome extension origin
const ALLOWED_ORIGINS = ["chrome-extension://oipojnhbkfgnldljeidogpkkeflmfokl"];

// Helper function to extract token from request
function getTokenFromRequest(request: NextRequest): string | undefined {
  // First try from cookie
  const tokenFromCookie = request.cookies.get("auth-token")?.value;
  console.log(
    `[Middleware] Cookie token: ${tokenFromCookie ? "Found" : "Not found"}`
  );
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  // Then try from Authorization header
  const authHeader = request.headers.get("authorization");
  console.log(
    `[Middleware] Authorization header: ${authHeader ? "Found" : "Not found"}`
  );
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return undefined;
}

// Simplified CORS handling
function handleCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") || "";

  // Allow all origins in development, restrict in production
  if (process.env.NODE_ENV === "development") {
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else {
    // In production, you might want to be more restrictive
    // You can implement stricter rules here
    response.headers.set("Access-Control-Allow-Origin", "*");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handleCors(request, new NextResponse(null, { status: 200 }));
  }

  // Handle regular requests
  const response = await handleRequest(request);
  return handleCors(request, response);
}

// Move the original middleware logic to a separate function
async function handleRequest(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is public
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    console.log(
      `[Middleware] Public path detected: ${pathname}, allowing access`
    );
    return NextResponse.next();
  }

  // Get token from cookie or header
  const token = getTokenFromRequest(request);
  console.log(`[Middleware] Token: ${token ? "Present" : "Missing"}`);

  if (!token) {
    // No token, redirect to login for UI or return 401 for API
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", request.nextUrl.pathname);
      console.log(
        `[Middleware] No token found, redirecting to login with from=${request.nextUrl.pathname}`
      );
      return NextResponse.redirect(url);
    }
  }

  try {
    // Verify JWT signature (this doesn't check if user exists in DB)
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET || "secret")
    );
    console.log(`[Middleware] Valid token for user:`, verified.payload);

    // We can't use PrismaClient in middleware (browser environment restriction)
    // Instead, we'll just rely on the JWT verification and let the API endpoints
    // perform additional validation if needed

    const response = NextResponse.next();
    // Add header to let client know auth status
    response.headers.set("x-auth-verified", "true");
    return response;
  } catch (error) {
    console.log(`[Middleware] Invalid token:`, error);

    // Invalid token, redirect to login or return 401
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", request.nextUrl.pathname);

      const response = NextResponse.redirect(url);
      // Delete invalid cookie
      response.cookies.delete("auth-token");

      return response;
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Exclude all _next paths
     */
    "/((?!_next|favicon.ico).*)",
  ],
};
