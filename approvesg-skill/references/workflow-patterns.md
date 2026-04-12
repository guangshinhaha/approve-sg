# Workflow Patterns

Common approval chain recipes for different use cases. Pick the pattern that matches your needs and adapt the approver roles to your organization.

## Pattern 1: Simple Manager Approval

**Use case:** Leave requests, expense claims under a threshold, equipment requests.

```json
{
  "workflowType": "leave_request",
  "name": "Leave Request Approval",
  "steps": [
    { "order": 1, "label": "Manager Approval", "approver_role": "manager", "required": true }
  ]
}
```

**Flow:** Submitter → Manager → Done

---

## Pattern 2: Two-Level Hierarchy

**Use case:** Purchase orders, travel claims, leave > 5 days.

```json
{
  "workflowType": "purchase_order",
  "name": "Purchase Order Approval",
  "steps": [
    { "order": 1, "label": "HOD Review", "approver_role": "hod", "required": true },
    { "order": 2, "label": "VP Approval", "approver_role": "vp", "required": true }
  ]
}
```

**Flow:** Submitter → HOD → VP → Done

---

## Pattern 3: Three-Level Escalation

**Use case:** High-value procurement, staff hiring, policy changes.

```json
{
  "workflowType": "procurement",
  "name": "Procurement Approval",
  "steps": [
    { "order": 1, "label": "Department Head Review", "approver_role": "hod", "required": true },
    { "order": 2, "label": "VP Endorsement", "approver_role": "vp", "required": true },
    { "order": 3, "label": "Principal Approval", "approver_role": "principal", "required": true }
  ]
}
```

**Flow:** Submitter → HOD → VP → Principal → Done

---

## Pattern 4: Technical + Administrative Review

**Use case:** IT change requests, system access requests, software deployments.

```json
{
  "workflowType": "change_request",
  "name": "IT Change Request",
  "steps": [
    { "order": 1, "label": "Technical Review", "approver_role": "tech_lead", "required": true },
    { "order": 2, "label": "Security Review", "approver_role": "security", "required": true },
    { "order": 3, "label": "CAB Approval", "approver_role": "change_board", "required": true }
  ]
}
```

---

## Pattern 5: Compliance Review

**Use case:** Data access requests, audit sign-offs, regulatory submissions.

```json
{
  "workflowType": "data_access",
  "name": "Data Access Request",
  "steps": [
    { "order": 1, "label": "Data Owner Approval", "approver_role": "data_owner", "required": true },
    { "order": 2, "label": "Compliance Review", "approver_role": "compliance", "required": true }
  ]
}
```

---

## Pattern 6: Content Publishing Pipeline

**Use case:** Blog posts, press releases, social media content, policy documents.

```json
{
  "workflowType": "content_publish",
  "name": "Content Publishing",
  "steps": [
    { "order": 1, "label": "Editor Review", "approver_role": "editor", "required": true },
    { "order": 2, "label": "Comms Approval", "approver_role": "comms_lead", "required": true }
  ]
}
```

---

## Choosing the Right Pattern

| Signal in host codebase | Suggested pattern |
|-------------------------|-------------------|
| Single `isApproved` boolean | Pattern 1 (simple manager) |
| Two-status: pending → approved | Pattern 1 or 2 |
| Role hierarchy (manager → director → VP) | Pattern 2 or 3 |
| Separate technical + business approval | Pattern 4 |
| Compliance/audit requirements | Pattern 5 |
| Content/document review | Pattern 6 |

## Tips

- **`approver_role` is a string** — it maps to roles in the OrgMember table. Use whatever role names your organization uses (e.g., `manager`, `hod`, `cfo`, `legal`).
- **`required: true`** means the step cannot be skipped. Set to `false` for optional review steps (not yet enforced by the engine — all steps are currently sequential).
- **`workflowType` is unique per org** — use snake_case identifiers like `leave_request`, `purchase_order`, etc.
- **Steps are strictly sequential** — step 2 only activates after step 1 is approved.
- **Send-back resets to step 1** — the submitter must resubmit, which restarts the chain.

## Mapping Existing Roles

If the host codebase has existing role definitions, map them to OrgMember roles:

```javascript
// Host product roles → ApproveSG approver_role mapping
const ROLE_MAP = {
  'team_lead': 'hod',       // team leads act as HODs
  'director': 'vp',         // directors act as VPs
  'ceo': 'principal',       // CEO acts as principal
};

// When creating a workflow, use the ApproveSG role names
// When displaying to users, map back to their familiar titles
```
