import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { SubmissionId } from "./submission-id";
import { TimeDisplay } from "./time-display";

interface ApprovalCardProps {
  submission: {
    id: string;
    status: string;
    currentStep: number;
    totalSteps?: number;
    currentStepLabel?: string | null;
    submittedBy: string;
    submittedAt: string;
    payload?: Record<string, unknown> | null;
    workflow?: { name: string } | null;
  };
}

export function ApprovalCard({ submission }: ApprovalCardProps) {
  const title =
    (submission.payload as Record<string, string>)?.title ||
    submission.workflow?.name ||
    "Untitled Submission";

  return (
    <Link
      href={`/submissions/${submission.id}`}
      className="block bg-white border border-approve-border rounded-card p-5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-grey-700 truncate">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <SubmissionId id={submission.id} />
            {submission.workflow && (
              <span className="text-xs text-approve-text-secondary">{submission.workflow.name}</span>
            )}
          </div>
        </div>
        <StatusBadge status={submission.status as any} size="sm" />
      </div>

      <div className="text-xs text-approve-text-secondary">
        <span>Submitted by {submission.submittedBy}</span>
        <span className="mx-1.5">·</span>
        <TimeDisplay date={submission.submittedAt} />
        {submission.totalSteps && (
          <>
            <span className="mx-1.5">·</span>
            <span>Step {submission.currentStep} of {submission.totalSteps}</span>
            {submission.currentStepLabel && (
              <span> · {submission.currentStepLabel}</span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
