"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { ActionButtons } from "@/components/action-buttons";
import { ActionDialog } from "@/components/action-dialog";
import { SubmissionId } from "@/components/submission-id";
import { TimeDisplay } from "@/components/time-display";
import { clientFetch } from "@/lib/client-fetch";
import { ArrowLeft, User, Clock, FileText } from "lucide-react";
import Link from "next/link";

interface SubmissionDetail {
  id: string;
  workflowId: string;
  workflowName: string;
  schoolCode: string;
  externalRef: string | null;
  externalType: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  currentStep: number;
  totalSteps: number;
  currentStepLabel: string | null;
  submittedBy: string;
  submittedAt: string;
  updatedAt: string;
  actions: Action[];
  workflow?: { steps: { order: number; label: string }[] };
}

interface Action {
  id: string;
  stepOrder: number;
  action: string;
  actor: string;
  actorRole: string | null;
  comments: string | null;
  actedAt: string;
}

type ActionType = "approve" | "reject" | "send-back";

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogAction, setDialogAction] = useState<ActionType | null>(null);

  const fetchSubmission = useCallback(() => {
    setLoading(true);
    clientFetch<SubmissionDetail>(`/api/submissions/${params.id}`)
      .then(setSubmission)
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleAction = async (action: ActionType, comments: string) => {
    const endpoint = `/api/submissions/${params.id}/${action}`;
    await clientFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ comments }),
    });
    fetchSubmission();
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-approve-text-secondary">Loading submission...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-approve-text-secondary">Submission not found.</p>
        <Link href="/submissions" className="text-sm text-approve-primary hover:underline mt-2 inline-block">
          Back to submissions
        </Link>
      </div>
    );
  }

  const title = (submission.payload as Record<string, string>)?.title || submission.workflowName;
  const isPending = submission.status === "pending";
  const steps = submission.workflow?.steps || [];

  return (
    <>
      {/* Back link */}
      <Link href="/submissions" className="inline-flex items-center gap-1.5 text-sm text-approve-text-secondary hover:text-approve-text mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to submissions
      </Link>

      <PageHeader
        title={title}
        action={<StatusBadge status={submission.status as any} />}
      />

      {/* Stepper */}
      {steps.length > 0 && (
        <div className="bg-white border border-approve-border rounded-card p-5 mb-5">
          <p className="text-xs font-semibold text-approve-text-secondary uppercase tracking-wide mb-3">
            Progress — Step {submission.currentStep} of {submission.totalSteps}
          </p>
          <WorkflowStepper steps={steps} currentStep={submission.currentStep} status={submission.status} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Action buttons for approvers */}
          {isPending && (
            <div className="bg-white border border-approve-border rounded-card p-5">
              <p className="text-sm font-semibold text-grey-700 mb-3">
                Awaiting: {submission.currentStepLabel || `Step ${submission.currentStep}`}
              </p>
              <ActionButtons
                onApprove={() => setDialogAction("approve")}
                onReject={() => setDialogAction("reject")}
                onSendBack={() => setDialogAction("send-back")}
              />
            </div>
          )}

          {/* Audit trail */}
          <div className="bg-white border border-approve-border rounded-card p-5">
            <h3 className="text-sm font-semibold text-grey-700 mb-4">Activity</h3>
            {submission.actions.length === 0 ? (
              <p className="text-sm text-approve-text-secondary">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {submission.actions.map((action) => (
                  <div key={action.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-approve-surface-alt flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-approve-text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold text-grey-700">
                          {action.actorRole ? `${action.actorRole.toUpperCase()} — ` : ""}
                          {action.actor}
                        </span>
                        {" "}
                        <StatusBadge status={action.action as any} size="sm" />
                        {" at step "}{action.stepOrder}
                      </p>
                      {action.comments && (
                        <p className="text-sm text-approve-text-secondary mt-1 italic">
                          &ldquo;{action.comments}&rdquo;
                        </p>
                      )}
                      <TimeDisplay date={action.actedAt} mode="both" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-5">
          <div className="bg-white border border-approve-border rounded-card p-5">
            <h3 className="text-sm font-semibold text-grey-700 mb-3">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-approve-text-secondary text-xs font-medium">Submission ID</dt>
                <dd><SubmissionId id={submission.id} /></dd>
              </div>
              <div>
                <dt className="text-approve-text-secondary text-xs font-medium">Workflow</dt>
                <dd className="text-grey-700">{submission.workflowName}</dd>
              </div>
              <div>
                <dt className="text-approve-text-secondary text-xs font-medium">Submitted by</dt>
                <dd className="text-grey-700">{submission.submittedBy}</dd>
              </div>
              <div>
                <dt className="text-approve-text-secondary text-xs font-medium">Submitted at</dt>
                <dd><TimeDisplay date={submission.submittedAt} mode="absolute" /></dd>
              </div>
              <div>
                <dt className="text-approve-text-secondary text-xs font-medium">Last updated</dt>
                <dd><TimeDisplay date={submission.updatedAt} mode="absolute" /></dd>
              </div>
              {submission.externalRef && (
                <div>
                  <dt className="text-approve-text-secondary text-xs font-medium">External Ref</dt>
                  <dd className="text-grey-700 font-mono text-xs">{submission.externalRef}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Action dialog */}
      {dialogAction && (
        <ActionDialog
          action={dialogAction}
          submissionId={submission.id}
          onClose={() => setDialogAction(null)}
          onConfirm={(comments) => handleAction(dialogAction, comments)}
        />
      )}
    </>
  );
}
