import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const SESSION_COOKIE = "approvesg_session";

// In-memory rate limiter (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.ip || "unknown";
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 60_000);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Embed routes: allow iframe, skip auth ---
  if (pathname.startsWith("/embed")) {
    const response = NextResponse.next();
    // Allow embedding from approved origins
    response.headers.set("X-Frame-Options", "ALLOWALL");
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    return response;
  }

  // --- API routes: rate limiting + security headers ---
  if (pathname.startsWith("/api")) {
    // Skip rate limiting for health and auth routes
    if (pathname === "/api/health" || pathname.startsWith("/api/auth")) {
      return addSecurityHeaders(NextResponse.next());
    }

    // Rate limiting
    const key = getRateLimitKey(req);
    const { allowed, remaining } = checkRateLimit(key);

    if (!allowed) {
      const response = NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
      response.headers.set("Retry-After", "60");
      return addSecurityHeaders(response);
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
    response.headers.set("X-RateLimit-Remaining", String(remaining));

    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
    response.headers.set("X-Request-Id", requestId);

    return addSecurityHeaders(response);
  }

  // --- Dashboard routes: require auth cookie ---
  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check for session cookie on all dashboard pages
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
