# ApproveSG Integration Skill

> Teach Claude how to integrate ApproveSG approval workflows into any host codebase, or scan a codebase to find hand-rolled approval chains that could be replaced.

## Trigger Conditions

### Integration Mode
Activate when the user says any of:
- "add approval to X"
- "integrate ApproveSG"
- "add approval workflow"
- "set up approval chains"
- "add an approval gate to ..."

### Scanner Mode
Activate when the user says any of:
- "find approval opportunities"
- "where should we add approval gates"
- "scan for hand-rolled approvals"
- "find approval patterns"

## Overview

ApproveSG is a multi-tenant, API-first approval engine. Any product can plug in configurable approval chains without rebuilding approval logic. The core flow:

```
Host product → Create submission via API → Submission routes through approval steps
→ Approvers act (approve/reject/send-back) → Webhooks notify host product of outcome
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Organization** | Tenant boundary. All data scoped by `orgId`. |
| **Workflow** | Defines an approval chain as ordered steps. Each step has a label and `approver_role`. |
| **Submission** | An instance moving through a workflow. Tracks `currentStep`, `status`, `stuckSince`. |
| **API Key** | Machine-to-machine auth. Prefixed `asg_live_`. Scoped (e.g. `submissions:write`). |
| **Embed Token** | Short-lived JWT for iframe UIs. Minted from API key + user context. |
| **Webhook** | HMAC-signed POST callbacks when submissions change state. |
| **Chase Reminder** | Auto-emails approvers every 72h when a step is stuck. |

### Integration Steps (High Level)

1. **Get an API key** — from the ApproveSG admin UI or via the host product's setup flow
2. **Define a workflow** — `POST /api/v1/workflows` with steps and approver roles
3. **Create submissions** — `POST /api/v1/submissions` when users submit things to approve
4. **Handle actions** — either via embedded UI (`/embed/inbox`) or direct API calls to approve/reject/send-back
5. **Receive outcomes** — register a webhook to get notified when submissions are approved/rejected
6. **Embed UIs** (optional) — drop iframes for workflow builder, inbox, submission timeline, analytics

### API Base URL

```
Production: https://approve-sg.up.railway.app
Local dev:  http://localhost:3000
```

All API endpoints are under `/api/v1/`. Auth via `Authorization: Bearer asg_live_...` header.

## Reference Files

Read these files for detailed implementation guidance:

| File | Contents |
|------|----------|
| `references/api-reference.md` | Every `/api/v1` endpoint — methods, schemas, scopes, response shapes, curl examples |
| `references/workflow-patterns.md` | Common approval chain recipes for different use cases |
| `references/embed-integration.md` | How to drop ApproveSG iframes into a host app |
| `references/webhook-events.md` | Webhook event shapes, HMAC verification code |
| `assets/openapi.yaml` | Machine-readable OpenAPI 3.0 spec |
| `assets/example-workflows.json` | Copy-paste workflow definitions |

## Integration Mode Instructions

When the user asks to integrate ApproveSG:

1. Read `references/api-reference.md` for the full endpoint surface
2. Read `references/workflow-patterns.md` to pick the right approval chain pattern
3. Read `references/embed-integration.md` if the user wants embedded UI
4. Read `references/webhook-events.md` if the user needs webhook handling

Then write the integration code:
- API key configuration (environment variable, never hardcoded)
- Workflow definition matching their use case
- Submission creation wired to their form/action handlers
- Webhook handler for approval outcomes
- Embed iframe placement (if needed)

## Scanner Mode Instructions

When the user asks to find approval opportunities:

1. **Grep for status patterns:**
   ```
   status.*(pending|approved|rejected|denied)
   is_approved|needs_review|needs_approval|awaiting_approval
   ```

2. **Grep for state machine patterns:**
   ```
   xstate|finite-state|state-machine
   transition.*approve|transition.*reject
   ```

3. **Grep for naming patterns:**
   ```
   submit.*request|submit.*application
   review.*request|authorize
   approval_chain|approval_flow|approval_step
   ```

4. **Grep for boolean flag patterns:**
   ```
   approved.*boolean|isApproved|is_approved
   requires_approval|approval_required
   ```

5. For each hit, read the surrounding 50 lines of code. Judge whether it's a hand-rolled approval chain by checking for:
   - Sequential status transitions (draft → pending → approved)
   - Role-based access checks before status changes
   - Email notifications tied to status changes
   - Audit logging of who changed what

6. Produce a ranked report:
   ```
   | Location | Current Behaviour | Suggested Gate | Effort |
   |----------|-------------------|----------------|--------|
   | src/orders/approve.ts:42 | Manual boolean flip | 2-step workflow (manager → director) | Low |
   ```

7. For the top candidates, sketch the integration: which ApproveSG workflow pattern to use, where to wire `createSubmission`, where to handle the webhook callback.
