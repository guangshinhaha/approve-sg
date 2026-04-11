import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_ID = "00000000-0000-0000-0000-00000000000a";

async function main() {
  // ── Default organization (legacy MOE pilot) ────────────────
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: "ApproveSG Demo School",
      slug: "demo-school",
      schoolCode: "SG001",
      plan: "free",
    },
  });

  // ── Org members (demo personas) ────────────────────────────
  const members = [
    { email: "alice.tan@school.edu.sg", name: "Alice Tan", roles: ["submitter"], externalUserId: "demo-submitter" },
    { email: "bob.lim@school.edu.sg", name: "Bob Lim", roles: ["approver"], externalUserId: "demo-approver" },
    { email: "carol.wong@school.edu.sg", name: "Carol Wong", roles: ["school_admin"], externalUserId: "demo-admin" },
    { email: "david.ng@moe.gov.sg", name: "David Ng", roles: ["platform_admin"], externalUserId: "demo-platform" },
  ];
  for (const m of members) {
    await prisma.orgMember.upsert({
      where: { orgId_email: { orgId: org.id, email: m.email } },
      update: { name: m.name, roles: m.roles, externalUserId: m.externalUserId },
      create: { orgId: org.id, ...m },
    });
  }

  // ── Workflows ──────────────────────────────────────────────
  const announcementWf = await prisma.workflow.upsert({
    where: { orgId_workflowType: { orgId: org.id, workflowType: "announcement_approval" } },
    update: {},
    create: {
      orgId: org.id,
      workflowType: "announcement_approval",
      name: "Parent Announcement Approval",
      createdBy: "seed",
      steps: [
        { order: 1, label: "HOD Review", approver_role: "approver", required: true },
        { order: 2, label: "VP Approval", approver_role: "approver", required: true },
      ],
    },
  });

  const resourceWf = await prisma.workflow.upsert({
    where: { orgId_workflowType: { orgId: org.id, workflowType: "resource_request" } },
    update: {},
    create: {
      orgId: org.id,
      workflowType: "resource_request",
      name: "Resource Request",
      createdBy: "seed",
      steps: [
        { order: 1, label: "HOD Approval", approver_role: "approver", required: true },
      ],
    },
  });

  const programmeWf = await prisma.workflow.upsert({
    where: { orgId_workflowType: { orgId: org.id, workflowType: "programme_proposal" } },
    update: {},
    create: {
      orgId: org.id,
      workflowType: "programme_proposal",
      name: "Programme Proposal",
      createdBy: "seed",
      steps: [
        { order: 1, label: "HOD Review", approver_role: "approver", required: true },
        { order: 2, label: "VP Review", approver_role: "approver", required: true },
        { order: 3, label: "Principal Approval", approver_role: "school_admin", required: true },
      ],
    },
  });

  // ── Submissions ────────────────────────────────────────────
  const s1 = await prisma.submission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      orgId: org.id,
      workflowId: announcementWf.id,
      submittedBy: "alice.tan@school.edu.sg",
      status: "approved",
      currentStep: 2,
      payload: {
        title: "Term 2 Parent Meeting",
        content: "Dear Parents, we invite you to our Term 2 parent-teacher meeting on 15 May.",
        recipients: "all_parents",
      },
    },
  });

  await prisma.approvalAction.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "00000000-0000-0000-0001-000000000001",
        submissionId: s1.id,
        stepOrder: 1,
        action: "approved",
        actor: "bob.lim@school.edu.sg",
        actorRole: "approver",
        comments: "Content looks good.",
      },
      {
        id: "00000000-0000-0000-0001-000000000002",
        submissionId: s1.id,
        stepOrder: 2,
        action: "approved",
        actor: "carol.wong@school.edu.sg",
        actorRole: "school_admin",
        comments: "Approved. Please send by Friday.",
      },
    ],
  });

  const s2 = await prisma.submission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      orgId: org.id,
      workflowId: announcementWf.id,
      submittedBy: "alice.tan@school.edu.sg",
      status: "pending",
      currentStep: 1,
      payload: {
        title: "Sports Day Postponement",
        content: "Due to weather, Sports Day is postponed to 22 May.",
        recipients: "all_parents",
      },
    },
  });

  const s3 = await prisma.submission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      orgId: org.id,
      workflowId: resourceWf.id,
      submittedBy: "alice.tan@school.edu.sg",
      status: "rejected",
      currentStep: 1,
      payload: {
        item: "Portable projectors x4",
        purpose: "Science practical sessions",
        estimated_cost: 3200,
      },
    },
  });

  await prisma.approvalAction.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "00000000-0000-0000-0001-000000000003",
        submissionId: s3.id,
        stepOrder: 1,
        action: "rejected",
        actor: "bob.lim@school.edu.sg",
        actorRole: "approver",
        comments: "Budget exceeded for this term. Please resubmit in Term 3.",
      },
    ],
  });

  const s4 = await prisma.submission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      orgId: org.id,
      workflowId: programmeWf.id,
      submittedBy: "alice.tan@school.edu.sg",
      status: "pending",
      currentStep: 2,
      payload: {
        title: "Reading Champions Programme",
        objective: "Improve literacy across P1-P3",
        duration: "6 months",
        budget: 8000,
      },
    },
  });

  await prisma.approvalAction.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "00000000-0000-0000-0001-000000000004",
        submissionId: s4.id,
        stepOrder: 1,
        action: "approved",
        actor: "bob.lim@school.edu.sg",
        actorRole: "approver",
        comments: "Strong proposal. Moving to VP review.",
      },
    ],
  });

  const s5 = await prisma.submission.upsert({
    where: { id: "00000000-0000-0000-0000-000000000005" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000005",
      orgId: org.id,
      workflowId: resourceWf.id,
      submittedBy: "alice.tan@school.edu.sg",
      status: "sent_back",
      currentStep: 1,
      payload: {
        item: "Whiteboard markers (bulk)",
        purpose: "Classroom use",
        estimated_cost: 150,
      },
    },
  });

  await prisma.approvalAction.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "00000000-0000-0000-0001-000000000005",
        submissionId: s5.id,
        stepOrder: 1,
        action: "sent_back",
        actor: "bob.lim@school.edu.sg",
        actorRole: "approver",
        comments: "Please specify the brand and quantity required.",
      },
    ],
  });

  console.log("Seed complete:", {
    org: org.id,
    workflows: [announcementWf.id, resourceWf.id, programmeWf.id],
    submissions: [s1.id, s2.id, s3.id, s4.id, s5.id],
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
