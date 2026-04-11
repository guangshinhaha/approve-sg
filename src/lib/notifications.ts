import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "./logger";

const ses = new SESv2Client({
  region: process.env.AWS_SES_REGION || "ap-southeast-1",
  ...(process.env.AWS_SES_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
    },
  }),
});

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@approve.moe.gov.sg";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://approve.moe.gov.sg";

interface ApprovalNotificationParams {
  orgId: string;
  step: { label: string; approver_role: string };
  submissionId: string;
  approverEmail?: string;
}

interface StatusNotificationParams {
  orgId: string;
  submittedBy: string;
  submissionId: string;
  status: string;
  comments?: string;
  submitterEmail?: string;
}

async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: EMAIL_FROM,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: htmlBody, Charset: "UTF-8" } },
          },
        },
      })
    );
    logger.info({ to, subject }, "Email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
    // Don't throw — notification failure should not block approval flow
  }
}

/**
 * Send email notification to the approver for the current step.
 */
export async function sendApprovalNotification(
  params: ApprovalNotificationParams
): Promise<void> {
  logger.info(
    {
      submissionId: params.submissionId,
      step: params.step.label,
      role: params.step.approver_role,
      orgId: params.orgId,
    },
    "Approval notification triggered"
  );

  // TODO: Resolve approver_role → actual email via MIMS role registry
  // For now, if approverEmail is provided directly, send the email
  if (params.approverEmail) {
    const subject = `[ApproveSG] Action required: ${params.step.label}`;
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Approval Required</h2>
        <p>A submission requires your review at the <strong>${params.step.label}</strong> step.</p>
        <p><strong>Submission ID:</strong> ${params.submissionId}</p>
        <p><strong>Organization:</strong> ${params.orgId}</p>
        <p>
          <a href="${APP_URL}/api/submissions/${params.submissionId}"
             style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
            Review Submission
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">This is an automated message from ApproveSG.</p>
      </div>
    `;
    await sendEmail(params.approverEmail, subject, html);
  }
}

/**
 * Send email notification to the submitter about status changes.
 */
export async function sendStatusNotification(
  params: StatusNotificationParams
): Promise<void> {
  logger.info(
    {
      submissionId: params.submissionId,
      status: params.status,
      submittedBy: params.submittedBy,
    },
    "Status notification triggered"
  );

  // TODO: Resolve submittedBy → actual email via MIMS
  if (params.submitterEmail) {
    const statusLabel =
      params.status === "approved" ? "Approved" :
      params.status === "rejected" ? "Rejected" :
      "Sent Back for Revision";

    const subject = `[ApproveSG] Submission ${statusLabel}`;
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Submission ${statusLabel}</h2>
        <p>Your submission has been <strong>${statusLabel.toLowerCase()}</strong>.</p>
        <p><strong>Submission ID:</strong> ${params.submissionId}</p>
        ${params.comments ? `<p><strong>Comments:</strong> ${params.comments}</p>` : ""}
        <p>
          <a href="${APP_URL}/api/submissions/${params.submissionId}"
             style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
            View Submission
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">This is an automated message from ApproveSG.</p>
      </div>
    `;
    await sendEmail(params.submitterEmail, subject, html);
  }
}
