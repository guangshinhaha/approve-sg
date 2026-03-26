import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

export interface AuthUser {
  userId: string;
  schoolCode: string;
  role: "submitter" | "approver" | "school_admin" | "platform_admin";
  email: string;
  name: string;
}

function demoSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "demo-secret-change-in-production"
  );
}

export async function verifyAuth(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

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
    throw new AuthError("Invalid or expired token");
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Enforce that the user belongs to the given school.
 * Prevents cross-tenant data access.
 */
export function enforceSchoolAccess(user: AuthUser, schoolCode: string): void {
  if (user.role === "platform_admin") return;
  if (user.schoolCode !== schoolCode) {
    throw new AuthError("Access denied: school code mismatch");
  }
}
