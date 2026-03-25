interface ApprovalNotificationParams {
  schoolCode: string;
  step: { label: string; approver_role: string };
  submissionId: string;
}

interface StatusNotificationParams {
  schoolCode: string;
  submittedBy: string;
  submissionId: string;
  status: string;
  comments?: string;
}

/**
 * Send email notification to the approver for the current step.
 * TODO: Integrate with AWS SES and MIMS role resolution for actual email delivery.
 */
export async function sendApprovalNotification(
  params: ApprovalNotificationParams
): Promise<void> {
  console.log(
    `[Notification] Approval needed: submission ${params.submissionId}, ` +
    `step "${params.step.label}" (role: ${params.step.approver_role}), ` +
    `school: ${params.schoolCode}`
  );

  // TODO: Resolve approver_role → actual email via MIMS
  // TODO: Send email via AWS SES
}

/**
 * Send email notification to the submitter about status changes.
 * TODO: Integrate with AWS SES for actual email delivery.
 */
export async function sendStatusNotification(
  params: StatusNotificationParams
): Promise<void> {
  console.log(
    `[Notification] Status update: submission ${params.submissionId} ` +
    `is now ${params.status} for user ${params.submittedBy}`
  );

  // TODO: Resolve submittedBy → actual email via MIMS
  // TODO: Send email via AWS SES
}
