"use client";

import { Check, X, HelpCircle } from "lucide-react";

interface CellValue {
  type: "yes" | "no" | "partial" | "text";
  text?: string;
}

interface Row {
  capability: string;
  applySG: CellValue;
  gatherSG: CellValue;
  plumber: CellValue;
  powerAutomate: CellValue;
  approveSG: CellValue;
}

const ROWS: Row[] = [
  {
    capability: "Headless / API-first",
    applySG: { type: "text", text: "Coupled to form builder" },
    gatherSG: { type: "no" },
    plumber: { type: "text", text: "Glue, not engine" },
    powerAutomate: { type: "text", text: "End-user tool" },
    approveSG: { type: "yes" },
  },
  {
    capability: "Multi-tenant (350+ orgs)",
    applySG: { type: "partial" },
    gatherSG: { type: "text", text: "1 app per tenant" },
    plumber: { type: "no" },
    powerAutomate: { type: "no" },
    approveSG: { type: "yes" },
  },
  {
    capability: "Configurable chains per tenant",
    applySG: { type: "yes" },
    gatherSG: { type: "text", text: "Case status workaround" },
    plumber: { type: "no" },
    powerAutomate: { type: "text", text: "Per-flow only" },
    approveSG: { type: "yes" },
  },
  {
    capability: "Role-based approver resolution",
    applySG: { type: "text", text: "Corppass/Singpass only" },
    gatherSG: { type: "no" },
    plumber: { type: "no" },
    powerAutomate: { type: "text", text: "Manual" },
    approveSG: { type: "text", text: "MIMS / WOG AAD" },
  },
  {
    capability: "Cross-product analytics",
    applySG: { type: "no" },
    gatherSG: { type: "no" },
    plumber: { type: "no" },
    powerAutomate: { type: "no" },
    approveSG: { type: "yes" },
  },
  {
    capability: "Self-service onboarding",
    applySG: { type: "text", text: "Takes weeks" },
    gatherSG: { type: "text", text: "Needs consultation" },
    plumber: { type: "text", text: "N/A" },
    powerAutomate: { type: "text", text: "DIY per team" },
    approveSG: { type: "text", text: "Hours" },
  },
];

const PRODUCTS = ["ApplySG", "GatherSG", "Plumber", "Power Automate", "ApproveSG"] as const;

function CellContent({ value }: { value: CellValue }) {
  switch (value.type) {
    case "yes":
      return (
        <span className="inline-flex items-center gap-1 text-status-approved">
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </span>
      );
    case "no":
      return (
        <span className="inline-flex items-center gap-1 text-status-rejected">
          <X className="h-4 w-4" strokeWidth={2.5} />
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1 text-status-pending">
          <HelpCircle className="h-4 w-4" strokeWidth={2} />
          <span className="text-xs">Unclear</span>
        </span>
      );
    case "text":
      return <span className="text-xs text-approve-text-secondary">{value.text}</span>;
  }
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-approve-border">
            <th className="py-3 pr-4 text-left font-semibold text-grey-700">Capability</th>
            {PRODUCTS.map((p) => (
              <th
                key={p}
                className={`px-3 py-3 text-center font-semibold ${
                  p === "ApproveSG"
                    ? "bg-approve-primary-light text-approve-primary"
                    : "text-grey-500"
                }`}
              >
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={i} className="border-b border-approve-border">
              <td className="py-3 pr-4 font-medium text-grey-700">{row.capability}</td>
              <td className="px-3 py-3 text-center"><CellContent value={row.applySG} /></td>
              <td className="px-3 py-3 text-center"><CellContent value={row.gatherSG} /></td>
              <td className="px-3 py-3 text-center"><CellContent value={row.plumber} /></td>
              <td className="px-3 py-3 text-center"><CellContent value={row.powerAutomate} /></td>
              <td className="bg-approve-primary-light/50 px-3 py-3 text-center">
                <CellContent value={row.approveSG} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
