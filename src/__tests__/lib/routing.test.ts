import {
  createSubmission,
  approveSubmission,
  rejectSubmission,
  sendBackSubmission,
} from "@/lib/routing";
import { prisma } from "@/lib/db";
import { AuthUser } from "@/lib/auth";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    workflow: { findUnique: jest.fn() },
    submission: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    approvalAction: { create: jest.fn() },
  },
}));

jest.mock("@/lib/notifications", () => ({
  sendApprovalNotification: jest.fn(),
  sendStatusNotification: jest.fn(),
}));

jest.mock("@/lib/webhooks", () => ({
  dispatchWebhookEvent: jest.fn(),
}));

const mockWorkflow = {
  id: "wf-1",
  schoolCode: "3001",
  workflowType: "announcement_approval",
  name: "Announcement Approval",
  steps: [
    { order: 1, label: "HOD Review", approver_role: "hod", required: true },
    { order: 2, label: "VP Approval", approver_role: "vp", required: true },
  ],
  active: true,
};

const mockApprover: AuthUser = {
  userId: "approver-1",
  schoolCode: "3001",
  role: "approver",
  email: "approver@schools.gov.sg",
  name: "Test Approver",
};

describe("createSubmission", () => {
  it("should create a submission and notify first approver", async () => {
    (prisma.workflow.findUnique as jest.Mock).mockResolvedValue(mockWorkflow);
    (prisma.submission.create as jest.Mock).mockResolvedValue({
      id: "sub-1",
      workflowId: "wf-1",
      schoolCode: "3001",
      status: "pending",
      currentStep: 1,
    });

    const result = await createSubmission({
      workflowId: "wf-1",
      schoolCode: "3001",
      submittedBy: "teacher-1",
    });

    expect(result.id).toBe("sub-1");
    expect(result.status).toBe("pending");
    expect(prisma.submission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workflowId: "wf-1",
          schoolCode: "3001",
          status: "pending",
          currentStep: 1,
        }),
      })
    );
  });

  it("should throw if workflow not found", async () => {
    (prisma.workflow.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      createSubmission({
        workflowId: "nonexistent",
        schoolCode: "3001",
        submittedBy: "teacher-1",
      })
    ).rejects.toThrow("Workflow not found");
  });

  it("should throw if school code mismatch", async () => {
    (prisma.workflow.findUnique as jest.Mock).mockResolvedValue(mockWorkflow);

    await expect(
      createSubmission({
        workflowId: "wf-1",
        schoolCode: "9999",
        submittedBy: "teacher-1",
      })
    ).rejects.toThrow("Workflow does not belong to this school");
  });
});

describe("approveSubmission", () => {
  const mockSubmission = {
    id: "sub-1",
    workflowId: "wf-1",
    schoolCode: "3001",
    status: "pending",
    currentStep: 1,
    submittedBy: "teacher-1",
    externalRef: "pg-123",
    externalType: "parents_gateway",
    workflow: mockWorkflow,
  };

  it("should advance to next step when not final", async () => {
    (prisma.submission.findUnique as jest.Mock).mockResolvedValue(mockSubmission);
    (prisma.approvalAction.create as jest.Mock).mockResolvedValue({});
    (prisma.submission.update as jest.Mock).mockResolvedValue({
      ...mockSubmission,
      currentStep: 2,
    });

    const result = await approveSubmission("sub-1", mockApprover, "Looks good");

    expect(result.currentStep).toBe(2);
    expect(prisma.approvalAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionId: "sub-1",
          stepOrder: 1,
          action: "approved",
        }),
      })
    );
  });

  it("should mark as approved on final step", async () => {
    const finalStepSubmission = { ...mockSubmission, currentStep: 2 };
    (prisma.submission.findUnique as jest.Mock).mockResolvedValue(finalStepSubmission);
    (prisma.approvalAction.create as jest.Mock).mockResolvedValue({});
    (prisma.submission.update as jest.Mock).mockResolvedValue({
      ...finalStepSubmission,
      status: "approved",
    });

    const result = await approveSubmission("sub-1", mockApprover);

    expect(result.status).toBe("approved");
    expect(prisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "approved" },
      })
    );
  });

  it("should throw if submission not pending", async () => {
    (prisma.submission.findUnique as jest.Mock).mockResolvedValue({
      ...mockSubmission,
      status: "approved",
    });

    await expect(approveSubmission("sub-1", mockApprover)).rejects.toThrow(
      "Submission is not in a pending state"
    );
  });
});

describe("rejectSubmission", () => {
  it("should reject and log action", async () => {
    const mockSubmission = {
      id: "sub-1",
      schoolCode: "3001",
      status: "pending",
      currentStep: 1,
      submittedBy: "teacher-1",
      externalRef: null,
      externalType: null,
    };

    (prisma.submission.findUnique as jest.Mock).mockResolvedValue(mockSubmission);
    (prisma.approvalAction.create as jest.Mock).mockResolvedValue({});
    (prisma.submission.update as jest.Mock).mockResolvedValue({
      ...mockSubmission,
      status: "rejected",
    });

    const result = await rejectSubmission("sub-1", mockApprover, "Needs revision");

    expect(result.status).toBe("rejected");
    expect(prisma.approvalAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "rejected",
          comments: "Needs revision",
        }),
      })
    );
  });
});

describe("sendBackSubmission", () => {
  it("should send back and reset to step 1", async () => {
    const mockSubmission = {
      id: "sub-1",
      schoolCode: "3001",
      status: "pending",
      currentStep: 2,
      submittedBy: "teacher-1",
      externalRef: null,
      externalType: null,
    };

    (prisma.submission.findUnique as jest.Mock).mockResolvedValue(mockSubmission);
    (prisma.approvalAction.create as jest.Mock).mockResolvedValue({});
    (prisma.submission.update as jest.Mock).mockResolvedValue({
      ...mockSubmission,
      status: "sent_back",
      currentStep: 1,
    });

    const result = await sendBackSubmission("sub-1", mockApprover, "Please fix");

    expect(result.status).toBe("sent_back");
    expect(result.currentStep).toBe(1);
    expect(prisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "sent_back", currentStep: 1 },
      })
    );
  });
});
