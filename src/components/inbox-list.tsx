"use client";

import { useState, useEffect } from "react";
import { Clock, FileText, Loader2, Inbox as InboxIcon } from "lucide-react";

interface InboxItem {
  id: string;
  workflowName: string;
  workflowType: string;
  externalRef: string | null;
  externalType: string | null;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  approverRole: string;
  submittedBy: string;
  submittedAt: string;
  stuckSince: string | null;
  stuckForMs: number;
}

interface InboxListProps {
  token: string;
  /** Base URL for submission detail links. Defaults to /embed/submissions */
  submissionBaseUrl?: string;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function InboxList({
  token,
  submissionBaseUrl = "/embed/submissions",
}: InboxListProps) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/embed/inbox", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load inbox");
        return r.json();
      })
      .then((data) => setItems(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-grey-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-status-rejected">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <InboxIcon className="w-10 h-10 text-grey-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-grey-500">Nothing waiting</p>
        <p className="text-xs text-grey-400 mt-1">
          You have no pending approvals at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const submissionUrl = `${submissionBaseUrl}/${item.id}?token=${encodeURIComponent(token)}`;

        return (
          <a
            key={item.id}
            href={submissionUrl}
            className="block rounded-card border border-approve-border p-4 hover:border-approve-primary hover:bg-approve-primary-light/30 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-approve-primary flex-shrink-0" />
                  <span className="text-sm font-semibold text-grey-700 truncate">
                    {item.workflowName}
                  </span>
                </div>
                <p className="text-xs text-approve-text-secondary">
                  Step {item.currentStep}/{item.totalSteps}:{" "}
                  <span className="font-medium">{item.stepLabel}</span>
                </p>
                <p className="text-xs text-grey-400 mt-0.5">
                  From: {item.submittedBy}
                  {item.externalRef && <span> · Ref: {item.externalRef}</span>}
                </p>
              </div>

              {/* Time stuck indicator */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock
                  className={`w-3.5 h-3.5 ${
                    item.stuckForMs > 72 * 60 * 60 * 1000
                      ? "text-status-rejected"
                      : item.stuckForMs > 24 * 60 * 60 * 1000
                      ? "text-status-pending"
                      : "text-grey-400"
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    item.stuckForMs > 72 * 60 * 60 * 1000
                      ? "text-status-rejected"
                      : item.stuckForMs > 24 * 60 * 60 * 1000
                      ? "text-status-pending"
                      : "text-grey-400"
                  }`}
                >
                  {formatDuration(item.stuckForMs)}
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
