"use client";

import { Check, X, RotateCcw } from "lucide-react";

interface ActionButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  onSendBack: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onApprove, onReject, onSendBack, disabled }: ActionButtonsProps) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      <button
        onClick={onApprove}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn text-sm font-semibold bg-status-approved text-white hover:opacity-90 transition-opacity disabled:opacity-50 focus-ring"
      >
        <Check className="w-4 h-4" strokeWidth={2.5} />
        Approve
      </button>
      <button
        onClick={onReject}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn text-sm font-semibold bg-status-rejected text-white hover:opacity-90 transition-opacity disabled:opacity-50 focus-ring"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
        Reject
      </button>
      <button
        onClick={onSendBack}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn text-sm font-semibold border-[1.5px] border-approve-border text-approve-text hover:bg-approve-surface-alt transition-colors disabled:opacity-50 focus-ring"
      >
        <RotateCcw className="w-4 h-4" strokeWidth={2} />
        Send Back
      </button>
    </div>
  );
}
