"use client";

interface TimeDisplayProps {
  date: string;
  mode?: "relative" | "absolute" | "both";
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatAbsolute(date);
}

function formatAbsolute(date: Date): string {
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  });
}

export function TimeDisplay({ date, mode = "relative" }: TimeDisplayProps) {
  const d = new Date(date);
  const absolute = formatAbsolute(d);
  const relative = getRelativeTime(d);

  if (mode === "absolute") {
    return <time dateTime={date} className="text-sm text-approve-text-secondary">{absolute}</time>;
  }

  if (mode === "both") {
    return (
      <time dateTime={date} className="text-sm text-approve-text-secondary" title={absolute}>
        {relative} · {absolute}
      </time>
    );
  }

  return (
    <time dateTime={date} className="text-sm text-approve-text-secondary" title={absolute}>
      {relative}
    </time>
  );
}
