import { prisma } from "@/lib/db";
import { getEmbedUser, parseTheme } from "@/lib/embed-auth";
import { EmbedShell } from "@/components/embed-shell";
import { StatusBadge } from "@/components/status-badge";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { SubmissionId } from "@/components/submission-id";
import { TimeDisplay } from "@/components/time-display";
import { notFound } from "next/navigation";
import { Clock, User, MessageSquare, AlertTriangle, Bell } from "lucide-react";

interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Embeddable submission timeline view.
 * Shows each approval step, who's assigned, time-in-step, stuckWith info,
 * chase reminder status, and full action history.
 */
export default async function EmbedSubmissionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const embedUser = await getEmbedUser(searchParams);
  const { cssVars, logoUrl } = parseTheme(searchParams);

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      workflow: true,
      actions: { orderBy: { actedAt: "asc" } },
      reminders: { orderBy: { stepOrder: "asc" } },
    },
  });

  if (!submission) notFound();

  // If embed token provided, enforce org scope
  if (embedUser && embedUser.orgId !== submission.orgId) notFound();

  const steps = (submission.workflow.steps as unknown as WorkflowStep[]) || [];
  const now = new Date();

  // Compute stuckWith — which role is currently blocking
  const currentStepDef = steps.find((s) => s.order === submission.currentStep);
  const stuckWith =
    submission.status === "pending" && currentStepDef
      ? currentStepDef.approver_role
      : null;

  // Time stuck at current step
  const timeAtCurrentStep = submission.stuckSince
    ? now.getTime() - new Date(submission.stuckSince).getTime()
    : 0;

  // Active chase reminder for current step
  const activeReminder = submission.reminders.find(
    (r) => r.stepOrder === submission.currentStep && !r.resolvedAt
  );

  // Build timeline of actions grouped by step
  const actionsByStep = new Map<number, typeof submission.actions>();
  for (const action of submission.actions) {
    const existing = actionsByStep.get(action.stepOrder) || [];
    existing.push(action);
    actionsByStep.set(action.stepOrder, existing);
  }

  return (
    <EmbedShell cssVars={cssVars} logoUrl={logoUrl}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SubmissionId id={submission.id} />
          <StatusBadge status={submission.status as any} size="sm" />
        </div>
      </div>

      {/* Stepper */}
      {steps.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-approve-text-secondary mb-2">
            Step {submission.currentStep} of {steps.length}
          </p>
          <WorkflowStepper
            steps={steps}
            currentStep={submission.currentStep}
            status={submission.status}
          />
        </div>
      )}

      {/* Stuck-with banner */}
      {stuckWith && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-status-pending bg-status-pending-bg p-4">
          <AlertTriangle className="w-4 h-4 text-status-pending mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-[var(--status-pending-text)]">
              Waiting on: <span className="uppercase">{stuckWith}</span>
            </p>
            <p className="text-[var(--status-pending-text)] mt-0.5">
              Stuck for {formatDuration(timeAtCurrentStep)}
              {activeReminder && activeReminder.sendCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {activeReminder.sendCount} reminder{activeReminder.sendCount !== 1 ? "s" : ""} sent
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="text-sm text-approve-text-secondary space-y-1.5 mb-6">
        <p>
          Workflow:{" "}
          <span className="text-grey-700 font-medium">
            {submission.workflow.name}
          </span>
        </p>
        <p>
          Submitted:{" "}
          <TimeDisplay
            date={submission.submittedAt.toISOString()}
            mode="both"
          />
        </p>
        {submission.externalRef && (
          <p>
            Reference:{" "}
            <span className="text-grey-700 font-medium">
              {submission.externalRef}
            </span>
          </p>
        )}
      </div>

      {/* Step-by-step timeline */}
      <div className="space-y-0">
        <h3 className="text-sm font-semibold text-grey-700 mb-3">
          Approval Timeline
        </h3>

        {steps.map((step) => {
          const stepActions = actionsByStep.get(step.order) || [];
          const isCurrentStep =
            submission.status === "pending" &&
            step.order === submission.currentStep;
          const isCompleted = stepActions.some((a) => a.action === "approved");
          const isRejected = stepActions.some((a) => a.action === "rejected");
          const isSentBack = stepActions.some((a) => a.action === "sent_back");
          const isPast =
            step.order < submission.currentStep ||
            submission.status === "approved";
          const resolvedReminder = submission.reminders.find(
            (r) => r.stepOrder === step.order && r.resolvedAt
          );
          const stepReminder =
            isCurrentStep && activeReminder
              ? activeReminder
              : resolvedReminder;

          return (
            <div key={step.order} className="relative pl-8 pb-6 last:pb-0">
              {/* Vertical line */}
              <div
                className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${
                  isCompleted || isPast
                    ? "bg-status-approved"
                    : isCurrentStep
                    ? "bg-approve-primary"
                    : "bg-grey-200"
                }`}
              />
              {/* Step dot */}
              <div
                className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCompleted || (isPast && !isRejected && !isSentBack)
                    ? "bg-status-approved text-white"
                    : isRejected
                    ? "bg-status-rejected text-white"
                    : isSentBack
                    ? "bg-status-sent-back text-white"
                    : isCurrentStep
                    ? "bg-approve-primary text-white animate-pulse-ring"
                    : "bg-grey-200 text-grey-400"
                }`}
              >
                {step.order}
              </div>

              {/* Step content */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-grey-700">
                    {step.label}
                  </span>
                  <span className="text-[11px] text-approve-text-secondary uppercase tracking-wide">
                    {step.approver_role}
                  </span>
                </div>

                {/* Action entries for this step */}
                {stepActions.map((action) => (
                  <div
                    key={action.id}
                    className="mt-2 flex items-start gap-2 text-sm"
                  >
                    <User className="w-3.5 h-3.5 text-grey-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-grey-600">
                        {action.actor}
                      </span>
                      {action.actorRole && (
                        <span className="text-grey-400 ml-1">
                          ({action.actorRole})
                        </span>
                      )}
                      <span className="ml-1.5">
                        {action.action === "approved" && (
                          <span className="text-status-approved font-medium">
                            approved
                          </span>
                        )}
                        {action.action === "rejected" && (
                          <span className="text-status-rejected font-medium">
                            rejected
                          </span>
                        )}
                        {action.action === "sent_back" && (
                          <span className="text-status-sent-back font-medium">
                            sent back
                          </span>
                        )}
                      </span>
                      <span className="ml-1.5 text-grey-400">
                        <TimeDisplay
                          date={action.actedAt.toISOString()}
                          mode="relative"
                        />
                      </span>
                      {action.comments && (
                        <div className="mt-1 flex items-start gap-1.5 text-grey-500">
                          <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="text-xs italic">
                            {action.comments}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Chase reminder info */}
                {stepReminder && stepReminder.sendCount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-grey-400">
                    <Bell className="w-3 h-3" />
                    {stepReminder.sendCount} chase reminder
                    {stepReminder.sendCount !== 1 ? "s" : ""} sent
                    {stepReminder.lastSentAt && (
                      <span>
                        {" "}
                        · last{" "}
                        <TimeDisplay
                          date={stepReminder.lastSentAt.toISOString()}
                          mode="relative"
                        />
                      </span>
                    )}
                  </div>
                )}

                {/* Current step: time waiting */}
                {isCurrentStep && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-status-pending">
                    <Clock className="w-3 h-3" />
                    Waiting for {formatDuration(timeAtCurrentStep)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </EmbedShell>
  );
}
