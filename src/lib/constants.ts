export const ROLES = {
  SUBMITTER: "submitter",
  APPROVER: "approver",
  SCHOOL_ADMIN: "school_admin",
  PLATFORM_ADMIN: "platform_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: readonly Role[] = [ROLES.SCHOOL_ADMIN, ROLES.PLATFORM_ADMIN];

export const SUBMISSION_STATUSES = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SENT_BACK: "sent_back",
} as const;

export type SubmissionStatus =
  (typeof SUBMISSION_STATUSES)[keyof typeof SUBMISSION_STATUSES];

export const WEBHOOK_EVENTS = {
  SUBMISSION_APPROVED: "submission.approved",
  SUBMISSION_REJECTED: "submission.rejected",
  SUBMISSION_SENT_BACK: "submission.sent_back",
  STEP_COMPLETED: "step.completed",
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const ALL_WEBHOOK_EVENTS = Object.values(WEBHOOK_EVENTS);

export const APPROVER_ROLES = {
  HOD: "hod",
  VP: "vp",
  PRINCIPAL: "principal",
} as const;

export const MAX_PAYLOAD_SIZE_BYTES = 1_048_576; // 1 MB
export const MAX_PAGINATION_LIMIT = 100;
export const DEFAULT_PAGINATION_LIMIT = 20;
export const WEBHOOK_TIMEOUT_MS = 10_000;
export const WEBHOOK_MAX_RETRIES = 3;
