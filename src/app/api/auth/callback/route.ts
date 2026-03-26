import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/session";

/**
 * GET /api/auth/callback — Handle MIMS OAuth callback
 * Exchanges auth code for JWT, stores in HTTP-only cookie.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Exchange code for token with MIMS
    const tokenRes = await fetch(
      process.env.MIMS_TOKEN_URL || "https://mims.moe.gov.sg/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.MIMS_CLIENT_ID || "",
          client_secret: process.env.MIMS_CLIENT_SECRET || "",
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        }),
      }
    );

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=token_exchange", req.url));
    }

    const { access_token } = await tokenRes.json();
    setSessionCookie(access_token);

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));
  }
}
