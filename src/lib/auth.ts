import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./db";
import { hashApiKey } from "./apiKeys";

export interface AuthUser {
  userId: string;
  orgId: string;
  role: "submitter" | "approver" | "school_admin" | "platform_admin";
  email: string;
  name: string;
}

export interface ApiKeyContext {
  type: "api_key";
  apiKeyId: string;
  orgId: string;
  scopes: string[];
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
      orgId: payload.org_id as string,
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
 * Enforce that the user belongs to the given organization.
 * Prevents cross-tenant data access. Platform admins bypass.
 */
export function enforceOrgAccess(user: AuthUser, orgId: string): void {
  if (user.role === "platform_admin") return;
  if (user.orgId !== orgId) {
    throw new AuthError("Access denied: organization mismatch");
  }
}

/**
 * Verify an API key from the Authorization header and resolve it to an
 * org-scoped context. Used by /api/v1 routes for machine-to-machine auth.
 */
export async function verifyApiKey(req: NextRequest): Promise<ApiKeyContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const raw = authHeader.slice(7);
  if (!raw.startsWith("asg_")) {
    throw new AuthError("Invalid API key format");
  }

  const hashed = hashApiKey(raw);
  const key = await prisma.apiKey.findUnique({ where: { hashedKey: hashed } });
  if (!key) throw new AuthError("Invalid API key");
  if (key.revokedAt) throw new AuthError("API key revoked");

  // Fire-and-forget; we don't block the request on this write.
  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    type: "api_key",
    apiKeyId: key.id,
    orgId: key.orgId,
    scopes: key.scopes,
  };
}

/**
 * Throw unless the key has at least one of the required scopes.
 * Scopes use "resource:action" format, e.g. "submissions:write".
 */
export function requireScope(ctx: ApiKeyContext, ...anyOf: string[]): void {
  if (ctx.scopes.includes("*")) return;
  if (anyOf.some((s) => ctx.scopes.includes(s))) return;
  throw new AuthError(`Missing required scope: ${anyOf.join(" or ")}`);
}
