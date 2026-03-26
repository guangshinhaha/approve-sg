import { CheckCircle } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "All caught up",
  description = "No pending approvals.",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-approve-primary-light flex items-center justify-center mb-4">
        {icon || <CheckCircle className="w-8 h-8 text-approve-primary" strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-semibold text-grey-700 mb-1">{title}</h3>
      <p className="text-sm text-approve-text-secondary max-w-xs">{description}</p>
    </div>
  );
}
