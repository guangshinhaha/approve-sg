import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { SubmissionId } from "@/components/submission-id";
import { TimeDisplay } from "@/components/time-display";
import { notFound } from "next/navigation";
import { CheckCircle } from "lucide-react";

interface WorkflowStep {
  order: number;
  label: string;
}

/**
 * Embeddable submission status view.
 * No sidebar, minimal chrome — designed to be iframed by consuming products.
 */
export default async function EmbedSubmissionPage({
  params,
}: {
  params: { id: string };
}) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { workflow: true },
  });

  if (!submission) notFound();

  const steps = (submission.workflow.steps as unknown as WorkflowStep[]) || [];

  return (
    <div className="min-h-screen bg-white p-6 font-sans">
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
          <WorkflowStepper steps={steps} currentStep={submission.currentStep} status={submission.status} />
        </div>
      )}

      {/* Details */}
      <div className="text-sm text-approve-text-secondary space-y-1.5">
        <p>Workflow: <span className="text-grey-700 font-medium">{submission.workflow.name}</span></p>
        <p>Submitted: <TimeDisplay date={submission.submittedAt.toISOString()} mode="absolute" /></p>
      </div>

      {/* Powered by */}
      <div className="mt-8 pt-4 border-t border-approve-border flex items-center gap-1.5">
        <div className="w-4 h-4 bg-approve-primary rounded-[3px] flex items-center justify-center">
          <CheckCircle className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
        <span className="text-[11px] text-grey-400">Powered by ApproveSG</span>
      </div>
    </div>
  );
}
