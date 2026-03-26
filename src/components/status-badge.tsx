const STATUS_CONFIG = {
  draft: { label: "Draft", dotClass: "bg-status-draft", bgClass: "bg-status-draft-bg", textColor: "text-[var(--status-draft-text)]" },
  pending: { label: "Pending", dotClass: "bg-status-pending", bgClass: "bg-status-pending-bg", textColor: "text-[var(--status-pending-text)]" },
  approved: { label: "Approved", dotClass: "bg-status-approved", bgClass: "bg-status-approved-bg", textColor: "text-[var(--status-approved-text)]" },
  rejected: { label: "Rejected", dotClass: "bg-status-rejected", bgClass: "bg-status-rejected-bg", textColor: "text-[var(--status-rejected-text)]" },
  sent_back: { label: "Sent Back", dotClass: "bg-status-sent-back", bgClass: "bg-status-sent-back-bg", textColor: "text-[var(--status-sent-back-text)]" },
} as const;

interface StatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const sizeClasses = size === "sm" ? "text-[11px] px-2.5 py-0.5" : "text-[13px] px-3.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-badge font-semibold ${config.bgClass} ${config.textColor} ${sizeClasses}`}
      aria-label={`Status: ${config.label}`}
    >
      <span className={`w-[7px] h-[7px] rounded-full ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
