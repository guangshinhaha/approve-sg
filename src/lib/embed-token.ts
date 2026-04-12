import { SignJWT, jwtVerify, JWTPayload } from "jose";

/**
 * Embed token auth — short-lived JWTs scoped to an org + user context.
 *
 * Flow: Host product backend calls POST /api/v1/embed-tokens with an API key
 * and user context (email, name, role). The endpoint mints a short-lived JWT.
 * The host product passes the token to the iframe via ?token=... query param.
 */

const EMBED_TOKEN_EXPIRY = "1h"; // Short-lived for security

export interface EmbedTokenPayload {
  orgId: string;
  email: string;
  name: string;
  role: string;
}

export interface EmbedUser {
  orgId: string;
  email: string;
  name: string;
  role: string;
}

function embedSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || "demo-secret-change-in-production"
  );
}

/**
 * Mint a short-lived embed token. Called by POST /api/v1/embed-tokens.
 */
export async function signEmbedToken(payload: EmbedTokenPayload): Promise<string> {
  return new SignJWT({
    org_id: payload.orgId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("approvesg-embed")
    .setIssuedAt()
    .setExpirationTime(EMBED_TOKEN_EXPIRY)
    .sign(embedSecret());
}

/**
 * Verify an embed token from the ?token= query parameter.
 * Returns the embedded user context or null if invalid/expired.
 */
export async function verifyEmbedToken(token: string): Promise<EmbedUser | null> {
  try {
    const { payload } = await jwtVerify(token, embedSecret(), {
      issuer: "approvesg-embed",
    });

    return {
      orgId: payload.org_id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
