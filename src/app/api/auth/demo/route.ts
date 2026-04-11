import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { setSessionCookie } from "@/lib/session";

const DEMO_ORG_ID = "00000000-0000-0000-0000-00000000000a";

const DEMO_USERS = [
  {
    id: "demo-submitter",
    name: "Alice Tan",
    email: "alice.tan@school.edu.sg",
    role: "submitter",
    orgId: DEMO_ORG_ID,
  },
  {
    id: "demo-approver",
    name: "Bob Lim",
    email: "bob.lim@school.edu.sg",
    role: "approver",
    orgId: DEMO_ORG_ID,
  },
  {
    id: "demo-admin",
    name: "Carol Wong",
    email: "carol.wong@school.edu.sg",
    role: "school_admin",
    orgId: DEMO_ORG_ID,
  },
  {
    id: "demo-platform",
    name: "David Ng",
    email: "david.ng@moe.gov.sg",
    role: "platform_admin",
    orgId: DEMO_ORG_ID,
  },
] as const;

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const user = DEMO_USERS.find((u) => u.id === userId);
  if (!user) {
    return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  }

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "demo-secret-change-in-production"
  );

  const token = await new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    org_id: user.orgId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("approvesg-demo")
    .setExpirationTime("8h")
    .sign(secret);

  setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
