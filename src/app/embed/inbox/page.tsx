import { getEmbedUser, parseTheme } from "@/lib/embed-auth";
import { EmbedShell } from "@/components/embed-shell";
import { InboxList } from "@/components/inbox-list";

/**
 * /embed/inbox — "What's waiting on me."
 *
 * Shows pending submissions where the current step's approver_role matches
 * the embed user's role. Clicking an item navigates to the submission detail.
 *
 * Query params:
 *   ?token=...  — embed JWT (required)
 *   ?theme=...  — brand matching (optional)
 */
export default async function InboxPage({
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
        Pending Approvals
      </h2>
      <p className="text-xs text-approve-text-secondary mb-5">
        Submissions waiting for your review as{" "}
        <span className="font-semibold uppercase">{embedUser.role}</span>.
      </p>

      <InboxList token={token} />
    </EmbedShell>
  );
}
