import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "./logger";
import { prisma } from "./db";

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

interface ChaseNotificationParams {
  orgId: string;
  submissionId: string;
  stepLabel: string;
  approverRole: string;
  sendCount: number;
  stuckSince: Date;
}

/**
 * Resolve an approver role inside an organization to the list of member emails
 * that carry that role. Used by the chase engine and by step notifications.
 */
export async function resolveApproverEmails(
  orgId: string,
  approverRole: string
): Promise<{ email: string; name: string }[]> {
  const members = await prisma.orgMember.findMany({
    where: { orgId, roles: { has: approverRole } },
    select: { email: true, name: true },
  });
  return members;
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
 * Send a chase reminder to everyone in the current step's approver role.
 * No-ops gracefully if the role has no members or if SES isn't configured.
 */
export async function sendChaseNotification(
  params: ChaseNotificationParams
): Promise<{ recipientCount: number }> {
  const recipients = await resolveApproverEmails(params.orgId, params.approverRole);

  logger.info(
    {
      submissionId: params.submissionId,
      approverRole: params.approverRole,
      sendCount: params.sendCount,
      recipients: recipients.length,
    },
    "Chase reminder triggered"
  );

  if (recipients.length === 0) return { recipientCount: 0 };

  const daysStuck = Math.floor(
    (Date.now() - params.stuckSince.getTime()) / (1000 * 60 * 60 * 24)
  );
  const reminderLabel = params.sendCount === 0 ? "Reminder" : `Reminder #${params.sendCount + 1}`;
  const subject = `[ApproveSG ${reminderLabel}] Approval still pending: ${params.stepLabel}`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Approval Still Pending</h2>
      <p>A submission has been waiting for your review at the <strong>${params.stepLabel}</strong> step
         for ${daysStuck} day${daysStuck === 1 ? "" : "s"}.</p>
      <p><strong>Submission ID:</strong> ${params.submissionId}</p>
      <p>
        <a href="${APP_URL}/submissions/${params.submissionId}"
           style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
          Review Submission
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">
        You are receiving this because you hold the <code>${params.approverRole}</code> role.
        ApproveSG sends reminders every 3 days until this step is resolved.
      </p>
    </div>
  `;

  await Promise.all(recipients.map((r) => sendEmail(r.email, subject, html)));
  return { recipientCount: recipients.length };
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
