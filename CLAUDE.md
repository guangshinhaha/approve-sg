# ApproveSG

Approval workflows as a multi-tenant SaaS platform. Originally built for Singapore MOE schools, now generalised so any product can integrate approval chains via API.

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma 5** ORM + **PostgreSQL** (Railway-hosted)
- **AWS SES** for email (not yet configured in production — notifications no-op gracefully)
- **Railway** for deployment (app service + Postgres + chase-cron service)

## Architecture

### Data Model (prisma/schema.prisma)

- **Organization** — the SaaS tenant. Has slug, optional schoolCode (legacy MOE), plan, theme settings.
- **OrgMember** — members of an org with roles (approver, submitter, school_admin, etc). Used by the chase engine to resolve approver_role → email addresses.
- **ApiKey** — org-scoped API keys (SHA-256 hashed, prefix stored for display). Scoped via string array (e.g. `submissions:read`, `workflows:write`, `*`).
- **Workflow** — defines an approval chain. `steps` is a JSONB array of `{ order, label, approver_role, required }`. Unique per `[orgId, workflowType]`.
- **Submission** — a request moving through a workflow. Tracks `currentStep`, `status` (pending/approved/rejected/sent_back), `stuckSince`, `payload` (JSONB).
- **ApprovalAction** — immutable audit log of every approve/reject/send-back action.
- **ChaseReminder** — tracks pending follow-up emails. Unique per `[submissionId, stepOrder]`. Has `nextDueAt`, `sendCount`, `resolvedAt`.
- **WebhookRegistration** — org-scoped webhook endpoints with HMAC-SHA256 signing.

### Auth (src/lib/auth.ts)

Two auth paths:

1. **Session auth (JWT)** — used by the dashboard UI. Demo persona picker mints HS256 JWTs with `org_id` claim. `verifyAuth(req)` reads from Authorization header or session cookie fallback.
2. **API key auth** — used by `/api/v1/*` routes. Keys prefixed `asg_live_`. `verifyApiKey(req)` hashes the token, looks up by hash, checks revocation, updates lastUsedAt. Returns `ApiKeyContext` with `orgId` and `scopes[]`. `requireScope(ctx, ...scopes)` gates individual routes.

### Route Tree

#### Dashboard routes (`/api/*`) — session auth via verifyAuth()
- `/api/auth/demo` — persona picker login
- `/api/submissions` — CRUD (org-scoped via user.orgId)
- `/api/submissions/[id]/{approve,reject,send-back}` — actions
- `/api/workflows` — list/create
- `/api/workflows/[id]` — get/update
- `/api/webhooks` — register/list
- `/api/webhooks/[id]` — delete
- `/api/api-keys` — mint/list (session auth, admin only)
- `/api/api-keys/[id]` — revoke
- `/api/audit-trail` — query audit log
- `/api/internal/chase` — chase engine trigger (X-Cron-Secret header)
- `/api/health` — healthcheck with DB connectivity

#### External API (`/api/v1/*`) — API key auth via verifyApiKey()
- `/api/v1/workflows` — GET (workflows:read), POST (workflows:write)
- `/api/v1/workflows/[id]` — GET (workflows:read)
- `/api/v1/submissions` — GET (submissions:read), POST (submissions:write)
- `/api/v1/submissions/[id]` — GET with `stuckWith` computed field (submissions:read)
- `/api/v1/submissions/[id]/{approve,reject,send-back}` — POST (submissions:approve). Actor identity comes from request body, not auth context.
- `/api/v1/webhooks` — GET (webhooks:read), POST (webhooks:write)

### Routing Engine (src/lib/routing.ts)

Core state machine for submissions. Functions accept `ActionActor { id, role }` so both session routes (pass user.userId/user.role) and API-key routes (pass body.actor/body.actorRole) can call them.

- `createSubmission()` — creates submission + chase reminder for step 1
- `approveSubmission()` — advances step or finalises, manages reminders
- `rejectSubmission()` — terminates flow, resolves reminders
- `sendBackSubmission()` — resets to step 1, resolves reminders

### Chase Engine (src/lib/chase.ts)

`runChaseCycle()` is triggered hourly by the Railway chase-cron service hitting `POST /api/internal/chase`.

- Finds all ChaseReminder where `resolvedAt IS NULL AND nextDueAt <= now`
- For each: verifies submission still pending at same step, resolves approver_role to org member emails, sends chase email, bumps sendCount and rolls nextDueAt forward by 72 hours
- Auto-resolves reminders when submission has moved on or hit the 10-send cap
- Idempotent: back-to-back runs are safe

### Email (src/lib/notifications.ts)

- `sendApprovalNotification()` — notify approver when a step becomes active
- `sendStatusNotification()` — notify submitter on approve/reject/send-back
- `sendChaseNotification()` — reminder email with days-stuck count, role info, review link
- `resolveApproverEmails(orgId, role)` — resolves role string to OrgMember emails
- All email functions no-op gracefully when SES isn't configured

## Railway Deployment

### Services

| Service | Type | Purpose |
|---------|------|---------|
| approve-sg | Web | Main Next.js app. Start: `npx prisma migrate deploy && npm start` |
| Postgres | Database | PostgreSQL 16. Internal URL referenced as DATABASE_URL + DIRECT_URL |
| chase-cron | Cron | Hits chase endpoint hourly. Image: built from same repo. Watch paths: `chase-cron.trigger` (never rebuilds on normal pushes). Cron: `0 * * * *`. Start: `curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://approve-sg.up.railway.app/api/internal/chase` |

### Environment Variables (approve-sg service)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
NEXT_PUBLIC_APP_URL=https://approve-sg.up.railway.app
JWT_SECRET=<generated>
CORS_ORIGIN=https://approve-sg.up.railway.app
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
LOG_LEVEL=info
RATE_LIMIT_MAX=100
EMAIL_FROM=noreply@approve.local
CRON_SECRET=<generated>
```

### Key deployment notes

- `railway.json` forces Nixpacks builder (Dockerfile renamed to Dockerfile.local so Railway doesn't detect it)
- `output: "standalone"` removed from next.config.js — incompatible with Nixpacks' `next start`
- HOSTNAME=0.0.0.0 required so Next.js binds to all interfaces inside the container
- PORT=3000 must match the public domain target port
- Migrations run automatically at startup via `prisma migrate deploy`

## Completed Phases

### Phase 1 — Multi-tenant SaaS foundation (commit a5beb85)

**Goal:** Let any product authenticate as a customer via API key, isolated from other tenants.

**What was built:**
- Organization, ApiKey, OrgMember models with row-level tenancy via orgId FK on all tables
- verifyApiKey() + requireScope() for machine-to-machine auth
- /api/v1/* route tree mirroring dashboard routes but API-key-scoped
- API key admin UI at /admin/api-keys with scope checkboxes, one-time plaintext display, revoke
- Seed creates default "ApproveSG Demo School" org with 4 demo personas
- schoolCode removed from all queries; now just a display field on Organization

**Key decisions:**
- Row-level multi-tenancy (single DB, orgId on every row)
- API keys use SHA-256 hash storage, `asg_live_` prefix
- ActionActor abstraction so routing lib serves both session and API-key callers
- Theme support via `?theme=` param (not yet implemented in embed pages)

### Phase 2 — Chase engine with 3-day reminders (commit d5ada18)

**Goal:** Automatically email approvers every 72h while a submission is stuck at their step.

**What was built:**
- ChaseReminder model tracking per-step reminder state
- Submission.stuckSince timestamp (for aging and email content)
- Reminder lifecycle wired into all routing functions (create/approve/reject/send-back)
- runChaseCycle() in src/lib/chase.ts — idempotent, self-cleaning
- sendChaseNotification() with OrgMember role-to-email resolution
- POST /api/internal/chase endpoint gated by X-Cron-Secret
- Railway chase-cron service running hourly

**Key decisions:**
- Fixed 72h interval (not per-workflow configurable yet — can add later)
- 10-send cap per step before auto-resolve (safety against infinite email loops)
- Reminders self-resolve when submission state changes
- SES not configured on Railway — emails log but don't send yet

### Phase 3 — Embeddable UI surfaces

**Goal:** Provide iframe-ready pages that host products drop into their own UIs, authenticated via short-lived embed tokens.

**What was built:**
- Embed token system: `signEmbedToken()` / `verifyEmbedToken()` in `src/lib/embed-token.ts` — HS256 JWTs with 1h expiry, `approvesg-embed` issuer
- `POST /api/v1/embed-tokens` — API-key-authed endpoint (scope: `embed:write`). Host product passes `{ email, name, role }`, receives a short-lived JWT
- Embed auth helpers in `src/lib/embed-auth.ts` — `getEmbedUser()` verifies `?token=` query param, `parseTheme()` parses `?theme=primaryColor,logoUrl`
- Embed API auth in `src/lib/embed-api-auth.ts` — `verifyEmbedAuth()` for `/api/embed/*` routes (reads embed JWT from Authorization header)
- `EmbedShell` component — shared wrapper with theme CSS variable injection, optional logo, "Powered by ApproveSG" footer
- `/embed/workflow-builder` — Interactive drag-and-drop approval chain editor. Add/remove/reorder steps, pick approver roles from OrgMember list, set labels and required flag. Creates new workflows or edits existing via `?workflowId=`
- `/embed/submissions/[id]` (upgraded) — Full timeline view with step-by-step history, stuckWith banner, time-in-step, chase reminder counts, action comments, and relative timestamps
- `/embed/inbox` — "What's waiting on me" view. Resolves embed user's roles via OrgMember, filters pending submissions where current step's approver_role matches. Shows time-stuck with colour coding (green < 24h, amber < 72h, red > 72h)
- Embed API routes: `GET/POST /api/embed/workflows`, `GET/PUT /api/embed/workflows/[id]`, `GET /api/embed/members` (roles list for builder), `GET /api/embed/inbox`
- `PUT /api/v1/workflows/[id]` — Added missing update endpoint for external API
- Middleware updated: `/api/embed/*` routes get iframe-friendly headers (`X-Frame-Options: ALLOWALL`, `frame-ancestors *`)
- `/embed/analytics` deferred until Phase 4 backend is ready

**Embed auth flow:** Host product backend → `POST /api/v1/embed-tokens` (with API key + user context) → receives short-lived JWT → passes to iframe as `?token=...`. Keeps the host product's user model authoritative.

**Styling:** `?theme=primaryColor,logoUrl` query param overrides `--approve-primary` CSS variable and displays optional logo.

**Key decisions:**
- Separate embed JWT issuer (`approvesg-embed`) from session JWT (`approvesg-demo`) for clean separation
- Embed pages work without token (unauthenticated submission view) but enforce org scope when token is present
- Dedicated `/api/embed/*` routes use embed token auth (not API keys) — keeps host product API keys server-side only
- Drag-and-drop reordering uses native HTML5 drag events (no extra dependencies)
- Inbox resolves user roles from OrgMember table, falling back to embed token role if no member record exists

## Planned Phases

### Phase 4 — Approval aging analytics

**Goal:** Let users track average approval aging to optimise processes.

**What to build:**

1. **Analytics endpoints:**
   - `GET /api/v1/analytics/aging` — avg/p50/p95 time-to-approve per workflow
   - `GET /api/v1/analytics/bottlenecks` — step-level time-in-state, ranked
   - `GET /api/v1/analytics/chase-impact` — response rate after N chases

2. **Computed from existing data:** ApprovalAction timestamps + Submission.submittedAt/stuckSince. No new tables needed initially.

3. **Materialised stats table** (`WorkflowStats`) — only needed if query cost becomes an issue under load. Skip until it does.

4. **`/embed/analytics`** — visual dashboard (part of Phase 3's embed surfaces). Bar/line charts showing aging trends, bottleneck steps highlighted in red.

### Phase 5 — Claude skill package

**Goal:** A Claude Code skill that teaches Claude how to integrate ApproveSG into any host codebase, including a "find approval opportunities" scanner mode.

**What to build:**

```
approvesg-skill/
  SKILL.md                  # Trigger conditions + workflow overview
  references/
    api-reference.md        # All /api/v1 endpoints with examples
    workflow-patterns.md    # Common approval chain recipes
    embed-integration.md   # How to drop iframes into a host app
    webhook-events.md      # Event shapes + HMAC verification
  assets/
    openapi.yaml            # Machine-readable contract (generate from Zod schemas)
    example-workflows.json  # Copy-paste starter chains
```

**Two modes:**

1. **Integration mode** — triggered when user asks "add approval to X" or "integrate ApproveSG". Claude reads the skill references, writes the integration code: API key setup, workflow definition, webhook handler, embed iframe placement.

2. **Scanner mode** — triggered when user asks "find approval opportunities" or "where should we add approval gates". Claude greps the host codebase for signals:
   - Status enums (pending/approved/rejected)
   - Boolean flags (is_approved, needs_review)
   - State-machine libraries (xstate, finite-state)
   - Form submit handlers writing to "requests"/"applications" tables
   - Naming patterns (submit, review, authorize)
   
   For each hit, reads surrounding code, judges if it's a hand-rolled approval chain that could be replaced, and produces a ranked report: location → current behaviour → suggested gate → integration sketch.

**Prerequisite:** OpenAPI spec generated from Zod schemas (via @asteasolutions/zod-to-openapi). This should be added to the main repo as part of Phase 5 prep.

## Local Development

```bash
# Install
npm ci

# Set up local Postgres (assuming Homebrew PostgreSQL running)
createdb approvesg
cp .env.example .env  # or use the existing .env

# Migrate + seed
npx prisma migrate dev
npm run db:seed

# Run
npm run dev          # http://localhost:3000

# Test chase locally
curl -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/internal/chase
```

## Conventions

- All DB queries are org-scoped via orgId FK — never query across orgs
- Session auth reads JWT from Authorization header OR session cookie (fallback for client-side fetches)
- API key auth only reads from Authorization header (Bearer asg_live_...)
- Routing functions take ActionActor { id, role } — not AuthUser — so both auth paths can call them
- Notifications never throw — email failures must not block approval state transitions
- Chase reminders self-resolve when submission state changes; no manual cleanup needed
