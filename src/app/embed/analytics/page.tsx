import { getEmbedUser, parseTheme } from "@/lib/embed-auth";
import { EmbedShell } from "@/components/embed-shell";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

/**
 * /embed/analytics — Approval aging analytics dashboard.
 *
 * Shows time-to-approve trends, bottleneck steps highlighted by severity,
 * and chase reminder effectiveness metrics.
 *
 * Query params:
 *   ?token=...  — embed JWT (required)
 *   ?theme=...  — brand matching (optional)
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const embedUser = await getEmbedUser(searchParams);
  const { cssVars, logoUrl } = parseTheme(searchParams);

  if (!embedUser) {
    return (
      <EmbedShell cssVars={cssVars} logoUrl={logoUrl}>
        <div className="text-center py-12">
          <p className="text-sm text-status-rejected font-medium">
            Invalid or expired embed token.
          </p>
          <p className="text-xs text-grey-400 mt-1">
            Please request a new token from the host application.
          </p>
        </div>
      </EmbedShell>
    );
  }

  const token =
    typeof searchParams.token === "string" ? searchParams.token : "";

  return (
    <EmbedShell cssVars={cssVars} logoUrl={logoUrl}>
      <h2 className="text-base font-bold text-grey-700 mb-1">
        Approval Analytics
      </h2>
      <p className="text-xs text-approve-text-secondary mb-5">
        Aging trends, bottleneck steps, and chase reminder effectiveness.
      </p>

      <AnalyticsDashboard token={token} />
    </EmbedShell>
  );
}
