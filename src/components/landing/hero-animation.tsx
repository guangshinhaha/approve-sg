"use client";

import { useEffect, useState } from "react";
import { PenLine, Eye, CheckCircle2, Rocket, ArrowRight } from "lucide-react";

const STEPS = [
  { icon: PenLine, label: "Submit", role: "Submitter" },
  { icon: Eye, label: "Review", role: "Reviewer" },
  { icon: CheckCircle2, label: "Approve", role: "Approver" },
  { icon: Rocket, label: "Done", role: "Complete" },
];

export function HeroAnimation() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto mt-8 max-w-2xl px-2">
      <div className="rounded-card border border-approve-border bg-white p-4 shadow-sm sm:p-6 overflow-hidden">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-approve-text-secondary">
          Live approval flow
        </p>
        <div className="flex items-start justify-center gap-0.5 sm:gap-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i < activeStep;
            const isActive = i === activeStep;

            return (
              <div key={i} className="flex items-start gap-0.5 sm:gap-2">
                {/* Step */}
                <div className="flex w-14 sm:w-20 flex-col items-center gap-1.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500 sm:h-12 sm:w-12 ${
                      isCompleted
                        ? "border-status-approved bg-status-approved-bg"
                        : isActive
                          ? "animate-pulse-ring border-approve-primary bg-approve-primary-light"
                          : "border-grey-200 bg-grey-100"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors duration-500 ${
                        isCompleted
                          ? "text-status-approved"
                          : isActive
                            ? "text-approve-primary"
                            : "text-grey-400"
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                  <span
                    className={`text-center text-[10px] leading-tight sm:text-xs transition-colors duration-500 ${
                      isCompleted
                        ? "font-medium text-status-approved"
                        : isActive
                          ? "font-semibold text-approve-primary"
                          : "text-grey-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="mt-3 flex flex-shrink-0 items-center sm:mt-4">
                    <div
                      className={`h-0.5 w-2 transition-colors duration-500 sm:w-6 ${
                        i < activeStep ? "bg-status-approved" : "bg-grey-200"
                      }`}
                    />
                    <ArrowRight
                      className={`h-2.5 w-2.5 transition-colors duration-500 sm:h-3 sm:w-3 ${
                        i < activeStep ? "text-status-approved" : "text-grey-300"
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
