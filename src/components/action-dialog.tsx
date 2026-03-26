"use client";

import { useState } from "react";

type ActionType = "approve" | "reject" | "send-back";

const ACTION_CONFIG = {
  approve: { title: "Approve Submission", btnLabel: "Confirm Approve", btnClass: "bg-status-approved text-white hover:opacity-90" },
  reject: { title: "Reject Submission", btnLabel: "Confirm Reject", btnClass: "bg-status-rejected text-white hover:opacity-90" },
  "send-back": { title: "Send Back for Revision", btnLabel: "Confirm Send Back", btnClass: "bg-approve-primary text-white hover:bg-approve-primary-dark" },
} as const;

interface ActionDialogProps {
  action: ActionType;
  submissionId: string;
  onClose: () => void;
  onConfirm: (comments: string) => Promise<void>;
}

export function ActionDialog({ action, submissionId, onClose, onConfirm }: ActionDialogProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const config = ACTION_CONFIG[action];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(comments);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-grey-700/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-card shadow-lg border border-approve-border w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-grey-700 mb-1">{config.title}</h2>
        <p className="text-sm text-approve-text-secondary mb-5">
          Submission ID: {submissionId.slice(0, 8).toUpperCase()}
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-approve-text mb-1.5">
            Comments {action !== "approve" && <span className="text-approve-text-secondary">(recommended)</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-approve-primary focus:border-transparent resize-none"
            placeholder={action === "approve" ? "Optional comments..." : "Reason for this action..."}
          />

          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-btn text-sm font-medium text-approve-text-secondary hover:bg-approve-surface-alt transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-btn text-sm font-semibold transition-opacity disabled:opacity-50 ${config.btnClass}`}
            >
              {loading ? "Processing..." : config.btnLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
