export interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

export interface WorkflowConfig {
  workflow_type: string;
  school_code: string;
  name: string;
  steps: WorkflowStep[];
}

export interface SubmissionResponse {
  id: string;
  workflowId: string;
  schoolCode: string;
  externalRef: string | null;
  externalType: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  currentStep: number;
  totalSteps: number;
  currentStepLabel: string | null;
  submittedBy: string;
  submittedAt: string;
  updatedAt: string;
  actions: ActionResponse[];
}

export interface ActionResponse {
  id: string;
  stepOrder: number;
  action: string;
  actor: string;
  actorRole: string | null;
  comments: string | null;
  actedAt: string;
}

export interface WebhookEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}
