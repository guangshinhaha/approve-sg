import { Check } from "lucide-react";

interface Step {
  order: number;
  label: string;
}

interface WorkflowStepperProps {
  steps: Step[];
  currentStep: number;
  status: string;
}

export function WorkflowStepper({ steps, currentStep, status }: WorkflowStepperProps) {
  const isTerminal = status === "approved" || status === "rejected";

  return (
    <div className="flex items-center w-full" role="list" aria-label={`Approval progress: step ${currentStep} of ${steps.length}`}>
      {/* Submitted (implicit step 0) */}
      <div className="flex items-center gap-2 flex-shrink-0" role="listitem">
        <div className="w-7 h-7 rounded-full bg-status-approved text-white flex items-center justify-center">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </div>
        <span className="text-xs font-semibold text-status-approved">Submitted</span>
      </div>

      {steps.map((step, i) => {
        const stepNum = step.order;
        const isComplete = isTerminal ? status === "approved" : stepNum < currentStep;
        const isActive = !isTerminal && stepNum === currentStep;
        const isUpcoming = !isComplete && !isActive;

        return (
          <div key={step.order} className="flex items-center flex-1 min-w-0" role="listitem">
            {/* Connector */}
            <div
              className={`flex-1 h-0.5 mx-2 min-w-[16px] ${
                isComplete ? "bg-status-approved" : "bg-grey-200"
              }`}
            />
            {/* Step circle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isComplete
                    ? "bg-status-approved text-white"
                    : isActive
                    ? "bg-approve-primary text-white"
                    : "bg-grey-200 text-grey-400"
                }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : stepNum}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  isComplete
                    ? "text-status-approved"
                    : isActive
                    ? "text-approve-primary"
                    : "text-grey-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}

      {/* Final state indicator */}
      {isTerminal && (
        <div className="flex items-center flex-shrink-0" role="listitem">
          <div className={`flex-1 h-0.5 mx-2 min-w-[16px] ${status === "approved" ? "bg-status-approved" : "bg-status-rejected"}`} />
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
                status === "approved" ? "bg-status-approved" : "bg-status-rejected"
              }`}
            >
              {status === "approved" ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : (
                <span className="text-xs font-bold">✗</span>
              )}
            </div>
            <span className={`text-xs font-semibold ${status === "approved" ? "text-status-approved" : "text-status-rejected"}`}>
              {status === "approved" ? "Complete" : "Rejected"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
