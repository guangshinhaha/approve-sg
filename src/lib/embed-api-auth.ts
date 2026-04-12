import { NextRequest } from "next/server";
import { verifyEmbedToken, EmbedUser } from "./embed-token";
import { AuthError } from "./auth";

/**
 * Verify an embed token from the Authorization header of an API request.
 * Used by /api/embed/* routes that serve the embedded UI components.
 */
export async function verifyEmbedAuth(req: NextRequest): Promise<EmbedUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);
  const user = await verifyEmbedToken(token);
  if (!user) {
    throw new AuthError("Invalid or expired embed token");
  }

  return user;
}
