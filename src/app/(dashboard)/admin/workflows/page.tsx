"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { clientFetch } from "@/lib/client-fetch";
import { Plus, GitBranch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

interface Workflow {
  id: string;
  schoolCode: string;
  workflowType: string;
  name: string;
  steps: { order: number; label: string; approver_role: string; required: boolean }[];
  active: boolean;
  createdAt: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", workflowType: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    clientFetch<{ data: Workflow[] }>("/api/workflows")
      .then((res) => setWorkflows(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await clientFetch("/api/workflows", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          workflowType: form.workflowType,
          steps: [
            { order: 1, label: "HOD Review", approver_role: "hod", required: true },
            { order: 2, label: "VP Approval", approver_role: "vp", required: true },
          ],
        }),
      });
      // Refresh
      const res = await clientFetch<{ data: Workflow[] }>("/api/workflows");
      setWorkflows(res.data);
      setShowCreate(false);
      setForm({ name: "", workflowType: "" });
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (w: Workflow) => <span className="font-semibold text-grey-700">{w.name}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (w: Workflow) => (
        <code className="text-xs bg-approve-surface-alt px-2 py-0.5 rounded text-approve-text-secondary">
          {w.workflowType}
        </code>
      ),
    },
    {
      key: "steps",
      label: "Steps",
      render: (w: Workflow) => <span className="text-approve-text-secondary">{w.steps.length} step{w.steps.length !== 1 ? "s" : ""}</span>,
    },
    {
      key: "active",
      label: "Status",
      render: (w: Workflow) => (
        <span className={`text-xs font-semibold ${w.active ? "text-status-approved" : "text-status-draft"}`}>
          {w.active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Configure approval workflows for your school."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-approve-border rounded-card p-5 mb-5">
          <h3 className="text-sm font-bold text-grey-700 mb-3">Create Workflow</h3>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-approve-text-secondary mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus:ring-2 focus:ring-approve-primary focus:border-transparent"
                placeholder="e.g. Parent Announcement Approval"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-approve-text-secondary mb-1">Type</label>
              <input
                type="text"
                value={form.workflowType}
                onChange={(e) => setForm({ ...form, workflowType: e.target.value })}
                required
                className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus:ring-2 focus:ring-approve-primary focus:border-transparent"
                placeholder="e.g. announcement_approval"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-btn text-sm text-approve-text-secondary hover:bg-approve-surface-alt"
            >
              Cancel
            </button>
          </form>
          <p className="text-xs text-approve-text-secondary mt-2">
            A default 2-step chain (HOD → VP) will be created. Edit steps after creation.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-approve-border rounded-card p-12 text-center">
          <p className="text-sm text-approve-text-secondary">Loading...</p>
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No workflows"
          description="Create your first approval workflow to get started."
          icon={<GitBranch className="w-8 h-8 text-approve-primary" />}
        />
      ) : (
        <DataTable
          columns={columns}
          data={workflows}
          onRowClick={(w) => router.push(`/admin/workflows/${w.id}`)}
        />
      )}
    </>
  );
}
