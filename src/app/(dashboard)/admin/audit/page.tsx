"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionId } from "@/components/submission-id";
import { TimeDisplay } from "@/components/time-display";
import { DataTable } from "@/components/data-table";
import { clientFetch } from "@/lib/api-client";

interface AuditAction {
  id: string;
  submissionId: string;
  stepOrder: number;
  action: string;
  actor: string;
  actorRole: string | null;
  comments: string | null;
  actedAt: string;
  submission: {
    id: string;
    externalRef: string | null;
    status: string;
  };
}

interface AuditResponse {
  data: AuditAction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function AuditTrailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<AuditAction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState(searchParams.get("action") || "");

  const page = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (actionFilter) params.set("action", actionFilter);

    clientFetch<AuditResponse>(`/api/audit-trail?${params}`)
      .then((res) => {
        setData(res.data);
        setPagination(res.pagination);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  const columns = [
    {
      key: "submission",
      label: "Submission",
      render: (a: AuditAction) => <SubmissionId id={a.submissionId} />,
    },
    {
      key: "action",
      label: "Action",
      render: (a: AuditAction) => <StatusBadge status={a.action as any} size="sm" />,
    },
    {
      key: "actor",
      label: "Actor",
      render: (a: AuditAction) => (
        <div>
          <span className="font-medium text-grey-700">{a.actor}</span>
          {a.actorRole && (
            <span className="text-approve-text-secondary ml-1.5 text-xs">({a.actorRole})</span>
          )}
        </div>
      ),
    },
    {
      key: "step",
      label: "Step",
      render: (a: AuditAction) => <span className="text-approve-text-secondary">Step {a.stepOrder}</span>,
    },
    {
      key: "comments",
      label: "Comments",
      render: (a: AuditAction) => (
        <span className="text-approve-text-secondary text-xs truncate max-w-[200px] block">
          {a.comments || "—"}
        </span>
      ),
    },
    {
      key: "time",
      label: "Time",
      render: (a: AuditAction) => <TimeDisplay date={a.actedAt} mode="absolute" />,
    },
  ];

  return (
    <>
      <PageHeader title="Audit Trail" description="Immutable log of all approval actions." />

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {["", "approved", "rejected", "sent_back"].map((a) => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            className={`px-3 py-1.5 rounded-badge text-xs font-semibold transition-colors ${
              actionFilter === a
                ? "bg-approve-primary text-white"
                : "bg-white border border-approve-border text-approve-text-secondary hover:bg-approve-surface-alt"
            }`}
          >
            {a === "" ? "All" : a.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-approve-border rounded-card p-12 text-center">
          <p className="text-sm text-approve-text-secondary">Loading...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            total: pagination.total,
            onPageChange: (p) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(p));
              router.push(`/admin/audit?${params}`);
            },
          }}
          emptyMessage="No audit records found."
        />
      )}
    </>
  );
}
