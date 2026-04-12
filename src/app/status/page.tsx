"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
  Database,
  Server,
  Bell,
  Cpu,
  Clock,
  BarChart3,
  Building2,
  GitBranch,
  FileText,
  Loader2,
} from "lucide-react";

const REFRESH_INTERVAL = 30; // seconds

interface CheckResult {
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  detail?: string;
}

interface StatusData {
  overall: "operational" | "degraded" | "down";
  timestamp: string;
  checks: {
    api: CheckResult;
    database: CheckResult;
    redis: CheckResult;
    chaseEngine: CheckResult;
  };
  metrics: {
    totalOrganizations: number;
    activeWorkflows: number;
    pendingSubmissions: number;
    totalSubmissions: number;
    approvedLast24h: number;
    activeChaseReminders: number;
    avgApprovalLatencyHours: number | null;
  };
}

function StatusIcon({ status }: { status: CheckResult["status"] }) {
  if (status === "operational")
    return <CheckCircle className="w-5 h-5 text-status-approved" />;
  if (status === "degraded")
    return <AlertTriangle className="w-5 h-5 text-status-pending" />;
  return <XCircle className="w-5 h-5 text-status-rejected" />;
}

function StatusDot({ status }: { status: CheckResult["status"] }) {
  const color =
    status === "operational"
      ? "bg-status-approved"
      : status === "degraded"
      ? "bg-status-pending"
      : "bg-status-rejected";
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  });
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [fetchLatency, setFetchLatency] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const start = performance.now();
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setFetchLatency(Math.round(performance.now() - start));
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : REFRESH_INTERVAL));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const overallLabel =
    data?.overall === "operational"
      ? "All Systems Operational"
      : data?.overall === "degraded"
      ? "Partial Degradation"
      : data?.overall === "down"
      ? "Service Disruption"
      : "Checking...";

  const overallBg =
    data?.overall === "operational"
      ? "bg-status-approved"
      : data?.overall === "degraded"
      ? "bg-status-pending"
      : data?.overall === "down"
      ? "bg-status-rejected"
      : "bg-grey-400";

  return (
    <div className="min-h-screen bg-approve-surface-alt">
      {/* Header */}
      <header className="bg-white border-b border-approve-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-approve-primary rounded-[8px] flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-bold text-grey-700">
                Approve<span className="text-approve-primary">SG</span>{" "}
                <span className="font-normal text-approve-text-secondary">
                  Status
                </span>
              </h1>
            </div>
          </div>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1.5 text-xs text-approve-text-secondary hover:text-approve-primary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Overall Status Banner */}
        <div className={`${overallBg} rounded-card p-5 text-center text-white`}>
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Running health checks...</span>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold">{overallLabel}</p>
              {data && (
                <p className="text-xs text-white/70 mt-1">
                  As of {formatTime(data.timestamp)} SGT
                </p>
              )}
            </>
          )}
        </div>

        {/* Refresh indicator */}
        <div className="flex items-center justify-between text-[11px] text-grey-400">
          <span>
            Page latency: {fetchLatency}ms
          </span>
          <span>
            Auto-refresh in {countdown}s
          </span>
        </div>

        {error && (
          <div className="rounded-card border border-status-rejected bg-status-rejected-bg p-4 text-sm text-status-rejected">
            Failed to fetch status: {error}
          </div>
        )}

        {data && (
          <>
            {/* Service Checks */}
            <section>
              <h2 className="text-sm font-semibold text-grey-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-approve-primary" />
                Service Health
              </h2>
              <div className="bg-white rounded-card border border-approve-border divide-y divide-approve-border">
                <ServiceRow
                  icon={<Server className="w-4 h-4" />}
                  label="API Server"
                  check={data.checks.api}
                />
                <ServiceRow
                  icon={<Database className="w-4 h-4" />}
                  label="Database (PostgreSQL)"
                  check={data.checks.database}
                />
                <ServiceRow
                  icon={<Cpu className="w-4 h-4" />}
                  label="Cache (Redis)"
                  check={data.checks.redis}
                />
                <ServiceRow
                  icon={<Bell className="w-4 h-4" />}
                  label="Chase Reminder Engine"
                  check={data.checks.chaseEngine}
                />
              </div>
            </section>

            {/* Platform Metrics */}
            <section>
              <h2 className="text-sm font-semibold text-grey-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-approve-primary" />
                Platform Metrics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={<Building2 className="w-4 h-4" />}
                  label="Organizations"
                  value={data.metrics.totalOrganizations}
                />
                <MetricCard
                  icon={<GitBranch className="w-4 h-4" />}
                  label="Active Workflows"
                  value={data.metrics.activeWorkflows}
                />
                <MetricCard
                  icon={<FileText className="w-4 h-4" />}
                  label="Total Submissions"
                  value={data.metrics.totalSubmissions}
                />
                <MetricCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Pending Now"
                  value={data.metrics.pendingSubmissions}
                  highlight={data.metrics.pendingSubmissions > 0}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <MetricCard
                  icon={<CheckCircle className="w-4 h-4" />}
                  label="Approved (24h)"
                  value={data.metrics.approvedLast24h}
                />
                <MetricCard
                  icon={<Bell className="w-4 h-4" />}
                  label="Active Reminders"
                  value={data.metrics.activeChaseReminders}
                />
                <MetricCard
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Avg Approval Time"
                  value={
                    data.metrics.avgApprovalLatencyHours !== null
                      ? `${data.metrics.avgApprovalLatencyHours}h`
                      : "—"
                  }
                />
              </div>
            </section>

            {/* Info */}
            <section className="text-center text-[11px] text-grey-400 pt-4 border-t border-approve-border space-y-1">
              <p>
                Status checks run on every page load. Data auto-refreshes every{" "}
                {REFRESH_INTERVAL} seconds.
              </p>
              <p>
                For integration support, see the{" "}
                <a
                  href="https://github.com/guangshinhaha/approve-sg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-approve-primary hover:underline"
                >
                  documentation
                </a>
                .
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function ServiceRow({
  icon,
  label,
  check,
}: {
  icon: React.ReactNode;
  label: string;
  check: CheckResult;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-approve-text-secondary">{icon}</span>
        <div>
          <span className="text-sm font-medium text-grey-700">{label}</span>
          {check.detail && (
            <p className="text-[11px] text-grey-400 mt-0.5">{check.detail}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {check.latencyMs > 0 && (
          <span className="text-[11px] text-grey-400 tabular-nums">
            {check.latencyMs}ms
          </span>
        )}
        <StatusDot status={check.status} />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-card border border-approve-border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-grey-400">{icon}</span>
        <span className="text-[11px] text-grey-400 font-medium uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-bold tabular-nums ${
          highlight ? "text-status-pending" : "text-grey-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
