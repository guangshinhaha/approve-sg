import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { AuthUser } from "./auth";

const SESSION_COOKIE = "approvesg_session";

const JWKS = createRemoteJWKSet(
  new URL(process.env.MIMS_JWKS_URL || "https://mims.moe.gov.sg/.well-known/jwks.json")
);

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.MIMS_ISSUER || "https://mims.moe.gov.sg",
    });

    return {
      userId: payload.sub as string,
      schoolCode: payload.school_code as string,
      role: payload.role as AuthUser["role"],
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function getSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}
