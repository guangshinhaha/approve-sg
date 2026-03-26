"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { clientFetch } from "@/lib/api-client";
import { ArrowLeft, GripVertical, Trash2, Plus, Save } from "lucide-react";
import Link from "next/link";

interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

interface Workflow {
  id: string;
  name: string;
  workflowType: string;
  steps: WorkflowStep[];
  active: boolean;
}

export default function EditWorkflowPage() {
  const params = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientFetch<Workflow>(`/api/workflows/${params.id}`)
      .then((w) => {
        setWorkflow(w);
        setSteps(w.steps);
        setName(w.name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const addStep = () => {
    setSteps([
      ...steps,
      { order: steps.length + 1, label: "", approver_role: "", required: true },
    ]);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(updated);
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: string | boolean) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await clientFetch(`/api/workflows/${params.id}`, {
        method: "PUT",
        body: JSON.stringify({ name, steps }),
      });
      router.push("/admin/workflows");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-approve-text-secondary">Loading...</div>;
  }

  if (!workflow) {
    return <div className="py-16 text-center text-sm text-approve-text-secondary">Workflow not found.</div>;
  }

  return (
    <>
      <Link href="/admin/workflows" className="inline-flex items-center gap-1.5 text-sm text-approve-text-secondary hover:text-approve-text mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to workflows
      </Link>

      <PageHeader
        title={`Edit: ${workflow.name}`}
        description={`Type: ${workflow.workflowType}`}
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      {/* Workflow name */}
      <div className="bg-white border border-approve-border rounded-card p-5 mb-5">
        <label className="block text-sm font-medium text-approve-text mb-1.5">Workflow Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md rounded-btn border border-approve-border px-3 py-2 text-sm focus:ring-2 focus:ring-approve-primary focus:border-transparent"
        />
      </div>

      {/* Steps editor */}
      <div className="bg-white border border-approve-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-grey-700">Approval Steps</h3>
          <button
            onClick={addStep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold text-approve-primary hover:bg-approve-primary-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 border border-approve-border rounded-btn bg-approve-surface-alt"
            >
              <GripVertical className="w-4 h-4 text-grey-400 flex-shrink-0 cursor-grab" />
              <span className="text-sm font-bold text-grey-400 w-6">{step.order}</span>

              <input
                type="text"
                value={step.label}
                onChange={(e) => updateStep(index, "label", e.target.value)}
                placeholder="Step label (e.g. HOD Review)"
                className="flex-1 rounded-btn border border-approve-border px-3 py-1.5 text-sm focus:ring-2 focus:ring-approve-primary focus:border-transparent"
              />

              <input
                type="text"
                value={step.approver_role}
                onChange={(e) => updateStep(index, "approver_role", e.target.value)}
                placeholder="Role (e.g. hod)"
                className="w-32 rounded-btn border border-approve-border px-3 py-1.5 text-sm focus:ring-2 focus:ring-approve-primary focus:border-transparent"
              />

              <label className="flex items-center gap-1.5 text-xs text-approve-text-secondary whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(e) => updateStep(index, "required", e.target.checked)}
                  className="rounded border-approve-border text-approve-primary focus:ring-approve-primary"
                />
                Required
              </label>

              <button
                onClick={() => removeStep(index)}
                disabled={steps.length <= 1}
                className="p-1.5 text-grey-400 hover:text-status-rejected disabled:opacity-30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
