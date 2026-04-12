import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_WINDOW_S = 60; // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
const SESSION_COOKIE = "approvesg_session";

// ── Redis rate limiter (distributed, multi-instance safe) ──────────

const redis: Redis | null = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

// ── In-memory fallback (single instance only) ─────────────────────

const RATE_LIMIT_MAX_ENTRIES = 10_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 10_000);

function checkRateLimitLocal(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    if (rateLimitStore.size >= RATE_LIMIT_MAX_ENTRIES) {
      const firstKey = rateLimitStore.keys().next().value;
      if (firstKey) rateLimitStore.delete(firstKey);
    }
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_S * 1000 });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

async function checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) return checkRateLimitLocal(key);

  try {
    const redisKey = `rl:${key}`;
    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.expire(redisKey, RATE_LIMIT_WINDOW_S);
    }
    const allowed = current <= RATE_LIMIT_MAX;
    return { allowed, remaining: Math.max(0, RATE_LIMIT_MAX - current) };
  } catch {
    // Redis down — fall back to in-memory
    return checkRateLimitLocal(key);
  }
}

// ── Middleware ─────────────────────────────────────────────────────

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.ip || "unknown";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Embed routes: allow iframe, skip auth ---
  if (pathname.startsWith("/embed")) {
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "ALLOWALL");
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    return response;
  }

  // --- API routes: rate limiting + security headers ---
  if (pathname.startsWith("/api")) {
    // Skip rate limiting for health, auth, and embed API routes
    if (pathname === "/api/health" || pathname === "/api/status" || pathname.startsWith("/api/auth")) {
      return addSecurityHeaders(NextResponse.next());
    }

    // Embed API routes: allow CORS for iframe-based fetch calls
    if (pathname.startsWith("/api/embed")) {
      const response = NextResponse.next();
      response.headers.set("X-Frame-Options", "ALLOWALL");
      response.headers.set("Content-Security-Policy", "frame-ancestors *");
      return addSecurityHeaders(response);
    }

    // Rate limiting (Redis when available, in-memory fallback)
    const key = getRateLimitKey(req);
    const { allowed, remaining } = await checkRateLimit(key);

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
  if (pathname === "/" || pathname === "/login" || pathname === "/status" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

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
