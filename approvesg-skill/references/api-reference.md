# ApproveSG API Reference

Base URL: `https://approve-sg.up.railway.app` (production) or `http://localhost:3000` (local dev)

All `/api/v1/*` endpoints require an API key via `Authorization: Bearer asg_live_...` header.

## Authentication

API keys use the format `asg_live_<32 hex chars>`. Keys are scoped — each key has specific permissions like `submissions:write`, `workflows:read`, etc. The wildcard scope `*` grants all permissions.

**Available scopes:**
- `submissions:read` — list/get submissions
- `submissions:write` — create submissions
- `submissions:approve` — approve/reject/send-back
- `workflows:read` — list/get workflows
- `workflows:write` — create/update workflows
- `webhooks:read` — list webhooks
- `webhooks:write` — create webhooks
- `embed:write` — mint embed tokens
- `analytics:read` — query analytics endpoints
- `*` — all scopes

---

## Workflows

### POST /api/v1/workflows

Create a workflow definition. Unique per `workflowType` within an org.

**Scope:** `workflows:write`

**Request body:**
```json
{
  "workflowType": "leave_request",
  "name": "Leave Request Approval",
  "steps": [
    { "order": 1, "label": "HOD Review", "approver_role": "hod", "required": true },
    { "order": 2, "label": "VP Approval", "approver_role": "vp", "required": true }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "orgId": "uuid",
  "workflowType": "leave_request",
  "name": "Leave Request Approval",
  "steps": [...],
  "active": true,
  "createdBy": "api_key:<key-id>",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**curl:**
```bash
curl -X POST https://approve-sg.up.railway.app/api/v1/workflows \
  -H "Authorization: Bearer asg_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "workflowType": "leave_request",
    "name": "Leave Request Approval",
    "steps": [
      { "order": 1, "label": "HOD Review", "approver_role": "hod", "required": true },
      { "order": 2, "label": "VP Approval", "approver_role": "vp", "required": true }
    ]
  }'
```

### GET /api/v1/workflows

List all active workflows for the org.

**Scope:** `workflows:read` or `workflows:write`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "workflowType": "leave_request",
      "name": "Leave Request Approval",
      "steps": [...],
      "active": true,
      ...
    }
  ]
}
```

### GET /api/v1/workflows/:id

Get a single workflow by ID.

**Scope:** `workflows:read` or `workflows:write`

### PUT /api/v1/workflows/:id

Update a workflow. All fields optional.

**Scope:** `workflows:write`

**Request body:**
```json
{
  "name": "Updated Name",
  "steps": [
    { "order": 1, "label": "Manager Review", "approver_role": "manager", "required": true }
  ],
  "active": false
}
```

---

## Submissions

### POST /api/v1/submissions

Create a submission and start the approval flow. The submission enters step 1 immediately.

**Scope:** `submissions:write`

**Request body:**
```json
{
  "workflowId": "uuid-of-workflow",
  "submittedBy": "user@example.com",
  "externalRef": "LEAVE-2024-001",
  "externalType": "leave_request",
  "payload": {
    "startDate": "2024-02-01",
    "endDate": "2024-02-05",
    "reason": "Annual leave"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowId` | UUID | Yes | Which workflow to use |
| `submittedBy` | string | Yes | Identity of the submitter (email, user ID, etc.) |
| `externalRef` | string | No | Your system's reference ID for linking back |
| `externalType` | string | No | Type label for the external reference |
| `payload` | object | No | Arbitrary JSON data (up to 1MB) |

**Response (201):** Submission object with `status: "pending"`, `currentStep: 1`.

**curl:**
```bash
curl -X POST https://approve-sg.up.railway.app/api/v1/submissions \
  -H "Authorization: Bearer asg_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "550e8400-e29b-41d4-a716-446655440000",
    "submittedBy": "teacher@school.edu.sg",
    "externalRef": "LEAVE-2024-001",
    "payload": { "days": 3, "reason": "Annual leave" }
  }'
```

### GET /api/v1/submissions

List submissions with optional filters and pagination.

**Scope:** `submissions:read` or `submissions:write`

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | all | Filter: `pending`, `approved`, `rejected`, `sent_back` |
| `workflowId` | UUID | all | Filter by workflow |
| `submittedBy` | string | all | Filter by submitter |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Results per page (max 100) |

**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

### GET /api/v1/submissions/:id

Get a single submission with full details including `stuckWith` computed field.

**Scope:** `submissions:read` or `submissions:write`

**Response:**
```json
{
  "id": "uuid",
  "status": "pending",
  "currentStep": 2,
  "totalSteps": 3,
  "currentStepLabel": "VP Approval",
  "stuckWith": {
    "stepOrder": 2,
    "stepLabel": "VP Approval",
    "approverRole": "vp",
    "sinceLastAction": "2024-01-16T14:00:00.000Z"
  },
  "submittedBy": "teacher@school.edu.sg",
  "submittedAt": "2024-01-15T10:00:00.000Z",
  "actions": [
    {
      "stepOrder": 1,
      "action": "approved",
      "actor": "hod@school.edu.sg",
      "actorRole": "hod",
      "comments": "Looks good",
      "actedAt": "2024-01-16T14:00:00.000Z"
    }
  ],
  ...
}
```

The `stuckWith` field is `null` when the submission is not pending. When present, it tells you exactly which role is blocking the flow.

### POST /api/v1/submissions/:id/approve

Approve the current step. If it's the final step, the submission status becomes `approved`.

**Scope:** `submissions:approve`

**Request body:**
```json
{
  "actor": "vp@school.edu.sg",
  "actorRole": "vp",
  "comments": "Approved for the requested dates"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actor` | string | Yes | Identity of the person approving |
| `actorRole` | string | No | Role (defaults to `"approver"`) |
| `comments` | string | No | Optional comment |

### POST /api/v1/submissions/:id/reject

Reject the submission. Terminal — ends the flow.

**Scope:** `submissions:approve`

**Request body:** Same shape as approve.

### POST /api/v1/submissions/:id/send-back

Send the submission back to the submitter for revision. Resets to step 1.

**Scope:** `submissions:approve`

**Request body:** Same shape as approve.

---

## Embed Tokens

### POST /api/v1/embed-tokens

Mint a short-lived JWT for embedding ApproveSG UI in an iframe. The host product backend calls this with its API key and passes the user context. The resulting token goes to the iframe via `?token=...`.

**Scope:** `embed:write`

**Request body:**
```json
{
  "email": "teacher@school.edu.sg",
  "name": "Jane Doe",
  "role": "hod"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Token expires in 1 hour. The issuer is `approvesg-embed`.

**curl:**
```bash
curl -X POST https://approve-sg.up.railway.app/api/v1/embed-tokens \
  -H "Authorization: Bearer asg_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{ "email": "teacher@school.edu.sg", "name": "Jane Doe", "role": "hod" }'
```

---

## Webhooks

### POST /api/v1/webhooks

Register a webhook endpoint.

**Scope:** `webhooks:write`

**Request body:**
```json
{
  "url": "https://myapp.com/webhooks/approvesg",
  "events": ["submission.approved", "submission.rejected"]
}
```

**Response (201):** Includes `secret` (HMAC key) — only returned on creation.

### GET /api/v1/webhooks

List registered webhooks. Secret is omitted.

**Scope:** `webhooks:read` or `webhooks:write`

---

## Analytics

### GET /api/v1/analytics/aging

Average time-to-approve per workflow.

**Scope:** `analytics:read`

**Query params:** `?workflowId=...&since=2024-01-01T00:00:00Z`

**Response:**
```json
{
  "data": [
    {
      "workflowId": "uuid",
      "workflowName": "Leave Request",
      "workflowType": "leave_request",
      "sampleSize": 42,
      "avgHours": 48.5,
      "p50Hours": 24.0,
      "p95Hours": 168.0,
      "minHours": 2.0,
      "maxHours": 240.0
    }
  ]
}
```

### GET /api/v1/analytics/bottlenecks

Step-level time-in-state, ranked by slowest.

**Scope:** `analytics:read`

**Response:**
```json
{
  "data": [
    {
      "workflowId": "uuid",
      "workflowName": "Leave Request",
      "stepOrder": 2,
      "stepLabel": "VP Approval",
      "approverRole": "vp",
      "sampleSize": 30,
      "avgHours": 72.5,
      "p50Hours": 48.0,
      "p95Hours": 168.0
    }
  ]
}
```

### GET /api/v1/analytics/chase-impact

Chase reminder effectiveness grouped by number of reminders sent.

**Scope:** `analytics:read`

**Response:**
```json
{
  "data": [
    {
      "chasesReceived": 1,
      "totalSteps": 50,
      "resolvedSteps": 45,
      "resolutionRate": 90.0,
      "avgHoursToResolve": 24.5
    }
  ]
}
```

---

## Error Responses

All errors follow the same shape:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error (bad input) |
| 401 | Missing/invalid/revoked API key |
| 403 | Scope insufficient or org mismatch |
| 404 | Resource not found |
| 409 | Conflict (duplicate workflow type, etc.) |
| 429 | Rate limited (100 req/min per IP) |
| 500 | Internal server error |

Validation errors include a `details` array:
```json
{
  "error": "Validation error",
  "details": [
    { "code": "too_small", "path": ["name"], "message": "String must contain at least 1 character(s)" }
  ]
}
```
