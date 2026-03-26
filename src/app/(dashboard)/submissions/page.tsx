"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionId } from "@/components/submission-id";
import { TimeDisplay } from "@/components/time-display";
import { DataTable } from "@/components/data-table";
import { clientFetch } from "@/lib/api-client";

interface Submission {
  id: string;
  status: string;
  currentStep: number;
  submittedBy: string;
  submittedAt: string;
  updatedAt: string;
  payload?: Record<string, unknown> | null;
  workflow?: { name: string; workflowType: string } | null;
}

interface ListResponse {
  data: Submission[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected", "sent_back", "draft"];

export default function SubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (status !== "all") params.set("status", status);

    clientFetch<ListResponse>(`/api/submissions?${params}`)
      .then((res) => {
        setData(res.data);
        setPagination(res.pagination);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [page, status]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/submissions?${params}`);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (newStatus !== "all") params.set("status", newStatus);
    router.push(`/submissions?${params}`);
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (item: Submission) => <SubmissionId id={item.id} />,
      className: "w-[100px]",
    },
    {
      key: "title",
      label: "Title",
      render: (item: Submission) => (
        <span className="font-medium text-grey-700">
          {(item.payload as Record<string, string>)?.title || item.workflow?.name || "Untitled"}
        </span>
      ),
    },
    {
      key: "workflow",
      label: "Workflow",
      render: (item: Submission) => (
        <span className="text-approve-text-secondary">{item.workflow?.name || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: Submission) => <StatusBadge status={item.status as any} size="sm" />,
    },
    {
      key: "submitted",
      label: "Submitted",
      render: (item: Submission) => <TimeDisplay date={item.submittedAt} />,
    },
  ];

  return (
    <>
      <PageHeader title="Submissions" description="Track and manage approval submissions." />

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-3 py-1.5 rounded-badge text-xs font-semibold transition-colors ${
              status === s
                ? "bg-approve-primary text-white"
                : "bg-white border border-approve-border text-approve-text-secondary hover:bg-approve-surface-alt"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
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
            onPageChange: handlePageChange,
          }}
          onRowClick={(item) => router.push(`/submissions/${item.id}`)}
          emptyMessage="No submissions found."
        />
      )}
    </>
  );
}
