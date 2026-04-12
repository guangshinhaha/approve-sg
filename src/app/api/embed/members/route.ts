import { NextRequest, NextResponse } from "next/server";
import { verifyEmbedAuth } from "@/lib/embed-api-auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/embed/members — List org members and their roles.
 * Used by the workflow builder to populate the approver_role picker.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyEmbedAuth(req);

    const members = await prisma.orgMember.findMany({
      where: { orgId: user.orgId },
      select: { id: true, name: true, email: true, roles: true },
      orderBy: { name: "asc" },
    });

    // Extract unique roles from all members
    const allRoles = new Set<string>();
    for (const m of members) {
      for (const r of m.roles) allRoles.add(r);
    }

    return NextResponse.json({
      data: members,
      roles: Array.from(allRoles).sort(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
