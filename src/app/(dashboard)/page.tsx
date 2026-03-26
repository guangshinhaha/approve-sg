import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ApprovalCard } from "@/components/approval-card";
import { EmptyState } from "@/components/empty-state";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";

interface SubmissionData {
  id: string;
  status: string;
  currentStep: number;
  submittedBy: string;
  submittedAt: string;
  payload?: Record<string, unknown> | null;
  workflow?: { name: string } | null;
}

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  let submissions: SubmissionData[] = [];
  let stats = { pending: 0, approved: 0, rejected: 0, total: 0 };

  try {
    const res = await apiGet<{ data: SubmissionData[]; pagination: { total: number } }>(
      "/api/submissions?limit=5"
    );
    submissions = res.data;

    // Compute stats from recent data (in production, a dedicated stats endpoint would be better)
    const allRes = await apiGet<{ pagination: { total: number } }>("/api/submissions?limit=1");
    stats.total = allRes.pagination.total;

    const pendingRes = await apiGet<{ pagination: { total: number } }>("/api/submissions?status=pending&limit=1");
    stats.pending = pendingRes.pagination.total;

    const approvedRes = await apiGet<{ pagination: { total: number } }>("/api/submissions?status=approved&limit=1");
    stats.approved = approvedRes.pagination.total;

    const rejectedRes = await apiGet<{ pagination: { total: number } }>("/api/submissions?status=rejected&limit=1");
    stats.rejected = rejectedRes.pagination.total;
  } catch {
    // API may not be available in dev without DB
  }

  const greeting = user.role === "approver" || user.role === "school_admin"
    ? "Pending your review"
    : "Your submissions";

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`${user.role.replace("_", " ")} · School ${user.schoolCode}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total" value={stats.total} />
        <StatCard icon={<Clock className="w-5 h-5 text-status-pending" />} label="Pending" value={stats.pending} highlight="pending" />
        <StatCard icon={<CheckCircle className="w-5 h-5 text-status-approved" />} label="Approved" value={stats.approved} highlight="approved" />
        <StatCard icon={<XCircle className="w-5 h-5 text-status-rejected" />} label="Rejected" value={stats.rejected} highlight="rejected" />
      </div>

      {/* Recent submissions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-grey-700">{greeting}</h2>
        <Link href="/submissions" className="text-sm font-medium text-approve-primary hover:underline">
          View all
        </Link>
      </div>

      {submissions.length === 0 ? (
        <EmptyState description="No submissions yet." />
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <ApprovalCard key={sub.id} submission={sub} />
          ))}
        </div>
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: "pending" | "approved" | "rejected";
}) {
  return (
    <div className="bg-white border border-approve-border rounded-card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-approve-text-secondary">{icon}</div>
        <span className="text-xs font-semibold text-approve-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-grey-700">{value}</p>
    </div>
  );
}
