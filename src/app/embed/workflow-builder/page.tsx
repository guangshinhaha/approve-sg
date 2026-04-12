import { getEmbedUser, parseTheme } from "@/lib/embed-auth";
import { EmbedShell } from "@/components/embed-shell";
import { WorkflowBuilder } from "@/components/workflow-builder";
import { prisma } from "@/lib/db";

/**
 * /embed/workflow-builder — Visual approval chain editor.
 *
 * Query params:
 *   ?token=...       — embed JWT (required)
 *   ?workflowId=...  — existing workflow to edit (optional, creates new if omitted)
 *   ?theme=...       — brand matching (optional)
 */
export default async function WorkflowBuilderPage({
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
  const workflowId =
    typeof searchParams.workflowId === "string"
      ? searchParams.workflowId
      : undefined;

  // Fetch available roles from org members
  const members = await prisma.orgMember.findMany({
    where: { orgId: embedUser.orgId },
    select: { roles: true },
  });
  const allRoles = new Set<string>();
  for (const m of members) {
    for (const r of m.roles) allRoles.add(r);
  }
  const roles = Array.from(allRoles).sort();

  return (
    <EmbedShell cssVars={cssVars} logoUrl={logoUrl}>
      <h2 className="text-base font-bold text-grey-700 mb-1">
        {workflowId ? "Edit Workflow" : "Create Workflow"}
      </h2>
      <p className="text-xs text-approve-text-secondary mb-5">
        Define the approval chain — add steps, assign roles, and drag to
        reorder.
      </p>

      <WorkflowBuilder
        token={token}
        workflowId={workflowId}
        roles={roles}
      />
    </EmbedShell>
  );
}
