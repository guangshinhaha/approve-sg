import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { AuthUser } from "./auth";

const SESSION_COOKIE = "approvesg_session";

function demoSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "demo-secret-change-in-production"
  );
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, demoSecret(), {
      issuer: "approvesg-demo",
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
