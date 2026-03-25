import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed workflow templates for a demo school
  const school3001 = await prisma.workflow.upsert({
    where: {
      schoolCode_workflowType: {
        schoolCode: "3001",
        workflowType: "announcement_approval",
      },
    },
    update: {},
    create: {
      schoolCode: "3001",
      workflowType: "announcement_approval",
      name: "Parent Announcement Approval",
      createdBy: "seed",
      steps: [
        { order: 1, label: "HOD Review", approver_role: "hod", required: true },
        { order: 2, label: "VP Approval", approver_role: "vp", required: true },
      ],
    },
  });

  const school3001Simple = await prisma.workflow.upsert({
    where: {
      schoolCode_workflowType: {
        schoolCode: "3001",
        workflowType: "resource_request",
      },
    },
    update: {},
    create: {
      schoolCode: "3001",
      workflowType: "resource_request",
      name: "Resource Request",
      createdBy: "seed",
      steps: [
        { order: 1, label: "HOD Approval", approver_role: "hod", required: true },
      ],
    },
  });

  const school3001Full = await prisma.workflow.upsert({
    where: {
      schoolCode_workflowType: {
        schoolCode: "3001",
        workflowType: "programme_proposal",
      },
    },
    update: {},
    create: {
      schoolCode: "3001",
      workflowType: "programme_proposal",
      name: "Programme Proposal",
      createdBy: "seed",
      steps: [
        { order: 1, label: "HOD Review", approver_role: "hod", required: true },
        { order: 2, label: "VP Review", approver_role: "vp", required: true },
        { order: 3, label: "Principal Approval", approver_role: "principal", required: true },
      ],
    },
  });

  console.log("Seeded workflows:", {
    school3001: school3001.id,
    school3001Simple: school3001Simple.id,
    school3001Full: school3001Full.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
