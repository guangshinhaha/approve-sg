import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { setSessionCookie } from "@/lib/session";

const DEMO_USERS = [
  {
    id: "demo-submitter",
    name: "Alice Tan",
    email: "alice.tan@school.edu.sg",
    role: "submitter",
    schoolCode: "SG001",
  },
  {
    id: "demo-approver",
    name: "Bob Lim",
    email: "bob.lim@school.edu.sg",
    role: "approver",
    schoolCode: "SG001",
  },
  {
    id: "demo-admin",
    name: "Carol Wong",
    email: "carol.wong@school.edu.sg",
    role: "school_admin",
    schoolCode: "SG001",
  },
  {
    id: "demo-platform",
    name: "David Ng",
    email: "david.ng@moe.gov.sg",
    role: "platform_admin",
    schoolCode: "MOE",
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
    school_code: user.schoolCode,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("approvesg-demo")
    .setExpirationTime("8h")
    .sign(secret);

  setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
