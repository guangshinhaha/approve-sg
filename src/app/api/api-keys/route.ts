import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/apiKeys";
import { handleApiError, AppError } from "@/lib/errors";

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).min(1),
});

/**
 * GET /api/api-keys — List API keys for the current org. Secrets are never returned.
 * Session auth. Admins only.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only admins can manage API keys", 403);
    }

    const keys = await prisma.apiKey.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: keys });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/api-keys — Mint a new API key. Returns the plaintext *once* in
 * the `plaintext` field — it can never be retrieved again. Admins only.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only admins can create API keys", 403);
    }

    const body = await req.json();
    const data = CreateApiKeySchema.parse(body);

    const { plaintext, hashed, prefix } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        orgId: user.orgId,
        name: data.name,
        hashedKey: hashed,
        prefix,
        scopes: data.scopes,
        createdBy: user.userId,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ...key, plaintext }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
