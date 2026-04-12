"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Bell,
  Clock,
} from "lucide-react";

interface AgingResult {
  workflowId: string;
  workflowName: string;
  workflowType: string;
  sampleSize: number;
  avgHours: number;
  p50Hours: number;
  p95Hours: number;
  minHours: number;
  maxHours: number;
}

interface BottleneckStep {
  workflowId: string;
  workflowName: string;
  stepOrder: number;
  stepLabel: string;
  approverRole: string;
  sampleSize: number;
  avgHours: number;
  p50Hours: number;
  p95Hours: number;
}

interface ChaseImpactBucket {
  chasesReceived: number;
  totalSteps: number;
  resolvedSteps: number;
  resolutionRate: number;
  avgHoursToResolve: number;
}

interface AnalyticsData {
  aging: AgingResult[];
  bottlenecks: BottleneckStep[];
  chaseImpact: ChaseImpactBucket[];
}

interface AnalyticsDashboardProps {
  token: string;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 1.5) return "1 day";
  return `${Math.round(days)} days`;
}

function BarSegment({
  value,
  maxValue,
  color,
}: {
  value: number;
  maxValue: number;
  color: string;
}) {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;
  return (
    <div
      className="h-6 rounded-sm transition-all duration-300"
      style={{ width: `${width}%`, backgroundColor: color }}
    />
  );
}

export function AnalyticsDashboard({ token }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (timeRange !== "all") {
      const since = new Date();
      if (timeRange === "7d") since.setDate(since.getDate() - 7);
      else if (timeRange === "30d") since.setDate(since.getDate() - 30);
      else if (timeRange === "90d") since.setDate(since.getDate() - 90);
      params.set("since", since.toISOString());
    }

    setLoading(true);
    fetch(`/api/embed/analytics?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-grey-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-status-rejected">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasData =
    data.aging.length > 0 ||
    data.bottlenecks.length > 0 ||
    data.chaseImpact.length > 0;

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        {["7d", "30d", "90d", "all"].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 text-xs font-semibold rounded-btn transition-colors ${
              timeRange === range
                ? "bg-approve-primary text-white"
                : "bg-grey-100 text-grey-500 hover:bg-grey-200"
            }`}
          >
            {range === "all" ? "All time" : `Last ${range}`}
          </button>
        ))}
      </div>

      {!hasData && (
        <div className="text-center py-12">
          <BarChart3 className="w-10 h-10 text-grey-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-grey-500">No data yet</p>
          <p className="text-xs text-grey-400 mt-1">
            Analytics will appear once submissions have been completed.
          </p>
        </div>
      )}

      {/* Aging per workflow */}
      {data.aging.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-approve-primary" />
            <h3 className="text-sm font-semibold text-grey-700">
              Time to Approve
            </h3>
          </div>
          <div className="space-y-3">
            {data.aging.map((wf) => {
              const maxVal = Math.max(...data.aging.map((a) => a.p95Hours));
              return (
                <div
                  key={wf.workflowId}
                  className="rounded-card border border-approve-border p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-grey-700">
                      {wf.workflowName}
                    </span>
                    <span className="text-[11px] text-grey-400">
                      {wf.sampleSize} submission
                      {wf.sampleSize !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-grey-400 w-8">Avg</span>
                      <div className="flex-1">
                        <BarSegment
                          value={wf.avgHours}
                          maxValue={maxVal}
                          color="var(--approve-primary)"
                        />
                      </div>
                      <span className="text-xs font-medium text-grey-600 w-16 text-right">
                        {formatHours(wf.avgHours)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-grey-400 w-8">P50</span>
                      <div className="flex-1">
                        <BarSegment
                          value={wf.p50Hours}
                          maxValue={maxVal}
                          color="var(--status-approved)"
                        />
                      </div>
                      <span className="text-xs font-medium text-grey-600 w-16 text-right">
                        {formatHours(wf.p50Hours)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-grey-400 w-8">P95</span>
                      <div className="flex-1">
                        <BarSegment
                          value={wf.p95Hours}
                          maxValue={maxVal}
                          color="var(--status-rejected)"
                        />
                      </div>
                      <span className="text-xs font-medium text-grey-600 w-16 text-right">
                        {formatHours(wf.p95Hours)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottleneck steps */}
      {data.bottlenecks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-status-pending" />
            <h3 className="text-sm font-semibold text-grey-700">
              Bottleneck Steps
            </h3>
          </div>
          <div className="space-y-1">
            {data.bottlenecks.slice(0, 10).map((step, i) => {
              const maxAvg = data.bottlenecks[0].avgHours; // already sorted desc
              const isHot = step.avgHours > 72; // > 3 days
              const isWarm = step.avgHours > 24; // > 1 day
              return (
                <div
                  key={`${step.workflowId}-${step.stepOrder}`}
                  className={`flex items-center gap-3 rounded-btn p-2.5 ${
                    isHot
                      ? "bg-status-rejected-bg"
                      : isWarm
                      ? "bg-status-pending-bg"
                      : "bg-grey-100"
                  }`}
                >
                  <span
                    className={`text-xs font-bold w-5 text-center ${
                      isHot
                        ? "text-status-rejected"
                        : isWarm
                        ? "text-status-pending"
                        : "text-grey-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-grey-700 truncate">
                        {step.stepLabel}
                      </span>
                      <span className="text-[10px] text-grey-400 uppercase">
                        {step.approverRole}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-white rounded-sm h-3 overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-300"
                          style={{
                            width: `${
                              maxAvg > 0
                                ? Math.max((step.avgHours / maxAvg) * 100, 3)
                                : 0
                            }%`,
                            backgroundColor: isHot
                              ? "var(--status-rejected)"
                              : isWarm
                              ? "var(--status-pending)"
                              : "var(--approve-primary)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-grey-700">
                      {formatHours(step.avgHours)}
                    </div>
                    <div className="text-[10px] text-grey-400">
                      avg ({step.sampleSize})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Chase impact */}
      {data.chaseImpact.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-approve-primary" />
            <h3 className="text-sm font-semibold text-grey-700">
              Chase Reminder Effectiveness
            </h3>
          </div>
          <div className="rounded-card border border-approve-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-grey-100 text-grey-500 text-[11px] uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-semibold">
                    Reminders
                  </th>
                  <th className="text-right px-3 py-2 font-semibold">Steps</th>
                  <th className="text-right px-3 py-2 font-semibold">
                    Resolved
                  </th>
                  <th className="text-right px-3 py-2 font-semibold">Rate</th>
                  <th className="text-right px-3 py-2 font-semibold">
                    <Clock className="w-3 h-3 inline" /> Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.chaseImpact.map((bucket) => (
                  <tr
                    key={bucket.chasesReceived}
                    className="border-t border-approve-border"
                  >
                    <td className="px-3 py-2 font-medium text-grey-700">
                      {bucket.chasesReceived} chase
                      {bucket.chasesReceived !== 1 ? "s" : ""}
                    </td>
                    <td className="px-3 py-2 text-right text-grey-500">
                      {bucket.totalSteps}
                    </td>
                    <td className="px-3 py-2 text-right text-grey-500">
                      {bucket.resolvedSteps}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-semibold ${
                          bucket.resolutionRate >= 80
                            ? "text-status-approved"
                            : bucket.resolutionRate >= 50
                            ? "text-status-pending"
                            : "text-status-rejected"
                        }`}
                      >
                        {bucket.resolutionRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-grey-500">
                      {formatHours(bucket.avgHoursToResolve)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
