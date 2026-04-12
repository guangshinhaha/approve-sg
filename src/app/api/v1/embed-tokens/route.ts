import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { signEmbedToken } from "@/lib/embed-token";
import { handleApiError } from "@/lib/errors";

const CreateEmbedTokenSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(100),
});

/**
 * POST /api/v1/embed-tokens — Mint a short-lived embed token.
 *
 * The host product backend calls this with an API key and the user context
 * (email, name, role) of the person who will view the embedded iframe.
 * Returns a JWT that the host product passes to the iframe via ?token=...
 *
 * Requires scope: embed:write (or wildcard)
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "embed:write", "*");

    const body = await req.json();
    const data = CreateEmbedTokenSchema.parse(body);

    const token = await signEmbedToken({
      orgId: ctx.orgId,
      email: data.email,
      name: data.name,
      role: data.role,
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
