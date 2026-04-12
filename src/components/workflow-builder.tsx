"use client";

import { useState, useCallback, useEffect } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

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

interface WorkflowBuilderProps {
  token: string;
  workflowId?: string;
  roles: string[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function WorkflowBuilder({
  token,
  workflowId,
  roles,
}: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [name, setName] = useState("");
  const [workflowType, setWorkflowType] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { order: 1, label: "", approver_role: "", required: true },
  ]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(!workflowId);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Load existing workflow
  useEffect(() => {
    if (!workflowId) return;
    fetch(`/api/embed/workflows/${workflowId}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load workflow");
        return r.json();
      })
      .then((data) => {
        setWorkflow(data);
        setName(data.name);
        setWorkflowType(data.workflowType);
        setSteps(data.steps || []);
        setIsNew(false);
      })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const reorderSteps = useCallback((stepsToReorder: WorkflowStep[]) => {
    return stepsToReorder.map((s, i) => ({ ...s, order: i + 1 }));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        order: prev.length + 1,
        label: "",
        approver_role: "",
        required: true,
      },
    ]);
  }, []);

  const removeStep = useCallback(
    (index: number) => {
      setSteps((prev) => {
        if (prev.length <= 1) return prev;
        const next = [...prev];
        next.splice(index, 1);
        return reorderSteps(next);
      });
    },
    [reorderSteps]
  );

  const updateStep = useCallback(
    (index: number, field: keyof WorkflowStep, value: string | boolean) => {
      setSteps((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  // Drag-and-drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;

      setSteps((prev) => {
        const next = [...prev];
        const [dragged] = next.splice(dragIndex, 1);
        next.splice(index, 0, dragged);
        setDragIndex(index);
        return reorderSteps(next);
      });
    },
    [dragIndex, reorderSteps]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const save = useCallback(async () => {
    setError(null);

    // Validate
    if (!name.trim()) {
      setError("Workflow name is required");
      return;
    }
    if (!workflowType.trim()) {
      setError("Workflow type is required");
      return;
    }
    for (const step of steps) {
      if (!step.label.trim() || !step.approver_role.trim()) {
        setError("All steps must have a label and approver role");
        return;
      }
    }

    setSaveStatus("saving");
    try {
      const url = isNew
        ? "/api/embed/workflows"
        : `/api/embed/workflows/${workflow!.id}`;
      const method = isNew ? "POST" : "PUT";
      const body = isNew
        ? { name, workflowType, steps }
        : { name, steps };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save workflow");
      }

      const saved = await res.json();
      setWorkflow(saved);
      setIsNew(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus("error");
    }
  }, [name, workflowType, steps, isNew, workflow, headers]);

  return (
    <div className="space-y-6">
      {/* Workflow metadata */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-grey-600 mb-1">
            Workflow Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Leave Request Approval"
            className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus-ring"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-grey-600 mb-1">
            Workflow Type
          </label>
          <input
            type="text"
            value={workflowType}
            onChange={(e) => setWorkflowType(e.target.value)}
            placeholder="e.g., leave_request"
            disabled={!isNew}
            className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus-ring disabled:bg-grey-100 disabled:text-grey-400"
          />
          {!isNew && (
            <p className="text-[11px] text-grey-400 mt-1">
              Workflow type cannot be changed after creation.
            </p>
          )}
        </div>
      </div>

      {/* Steps editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-grey-700">
            Approval Steps
          </h3>
          <button
            onClick={addStep}
            className="inline-flex items-center gap-1 text-xs font-semibold text-approve-primary hover:text-approve-primary-dark transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Step
          </button>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={`step-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 rounded-card border p-3 transition-all ${
                dragIndex === index
                  ? "border-approve-primary bg-approve-primary-light shadow-sm"
                  : "border-approve-border bg-white hover:border-grey-300"
              }`}
            >
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing text-grey-400 hover:text-grey-500 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Step number */}
              <div className="w-7 h-7 rounded-full bg-approve-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {step.order}
              </div>

              {/* Step fields */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStep(index, "label", e.target.value)}
                  placeholder="Step label (e.g., HOD Review)"
                  className="rounded-btn border border-approve-border px-2.5 py-1.5 text-sm focus-ring"
                />
                {roles.length > 0 ? (
                  <select
                    value={step.approver_role}
                    onChange={(e) =>
                      updateStep(index, "approver_role", e.target.value)
                    }
                    className="rounded-btn border border-approve-border px-2.5 py-1.5 text-sm focus-ring"
                  >
                    <option value="">Select role...</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={step.approver_role}
                    onChange={(e) =>
                      updateStep(index, "approver_role", e.target.value)
                    }
                    placeholder="Approver role (e.g., hod)"
                    className="rounded-btn border border-approve-border px-2.5 py-1.5 text-sm focus-ring"
                  />
                )}
              </div>

              {/* Required toggle */}
              <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={step.required}
                  onChange={(e) =>
                    updateStep(index, "required", e.target.checked)
                  }
                  className="rounded border-grey-300 text-approve-primary focus:ring-approve-primary"
                />
                <span className="text-[11px] text-grey-500">Required</span>
              </label>

              {/* Remove button */}
              <button
                onClick={() => removeStep(index)}
                disabled={steps.length <= 1}
                className="text-grey-400 hover:text-status-rejected disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                title="Remove step"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-status-rejected bg-status-rejected-bg p-3 rounded-card">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saveStatus === "saving"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-approve-primary text-white text-sm font-semibold hover:bg-approve-primary-dark disabled:opacity-60 transition-colors"
        >
          {saveStatus === "saving" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isNew ? "Create Workflow" : "Save Changes"}
        </button>
        {saveStatus === "saved" && (
          <span className="inline-flex items-center gap-1 text-sm text-status-approved">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
