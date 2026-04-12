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
| Postgres | Database | PostgreSQL 16. Internal URL referenced as DATABASE_URL |
| chase-cron | Cron | Hits chase endpoint hourly. Uses `Dockerfile.chase-cron` (Alpine + curl, no Node/Prisma). Watch paths: `chase-cron.trigger`, `chase-cron/`, `Dockerfile.chase-cron`. Cron: `0 * * * *`. Env: `CRON_SECRET`, `APP_URL`. Retries 3x with exponential backoff. |

### Environment Variables (approve-sg service)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
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
- `/embed/analytics` — implemented in Phase 4 with full visual dashboard

**Embed auth flow:** Host product backend → `POST /api/v1/embed-tokens` (with API key + user context) → receives short-lived JWT → passes to iframe as `?token=...`. Keeps the host product's user model authoritative.

**Styling:** `?theme=primaryColor,logoUrl` query param overrides `--approve-primary` CSS variable and displays optional logo.

**Key decisions:**
- Separate embed JWT issuer (`approvesg-embed`) from session JWT (`approvesg-demo`) for clean separation
- Embed pages work without token (unauthenticated submission view) but enforce org scope when token is present
- Dedicated `/api/embed/*` routes use embed token auth (not API keys) — keeps host product API keys server-side only
- Drag-and-drop reordering uses native HTML5 drag events (no extra dependencies)
- Inbox resolves user roles from OrgMember table, falling back to embed token role if no member record exists

### Phase 4 — Approval aging analytics

**Goal:** Let users track average approval aging to optimise processes.

**What was built:**
- Analytics computation library in `src/lib/analytics.ts` — pure functions computing stats from existing ApprovalAction + Submission + ChaseReminder data. No new tables needed.
- `GET /api/v1/analytics/aging` — avg/p50/p95/min/max time-to-approve per workflow. Scope: `analytics:read`
- `GET /api/v1/analytics/bottlenecks` — step-level time-in-state ranked by slowest. Computes duration from previous step's approval (or submittedAt for step 1) to current step's action
- `GET /api/v1/analytics/chase-impact` — groups resolved chase reminders by sendCount, shows resolution rate and avg time to resolve after last chase
- `GET /api/embed/analytics` — combined endpoint returning all three datasets in one response (embed-token-authed) to avoid multiple round-trips from the dashboard
- `/embed/analytics` — visual dashboard with time range selector (7d/30d/90d/all), horizontal bar charts for aging per workflow (avg/p50/p95), ranked bottleneck list with severity colouring (red > 72h, amber > 24h), and chase effectiveness table
- All endpoints support `?workflowId=` and `?since=` query params for filtering

**Key decisions:**
- All analytics computed on-the-fly from existing data — no materialised stats table. Can add WorkflowStats later if query cost becomes an issue under load
- Bottleneck time-in-state uses ApprovalAction sequence to derive step start/end times rather than tracking explicit per-step timestamps
- Chase impact groups by sendCount (how many reminders a step received) to show diminishing returns of repeated chasing
- Dashboard uses pure CSS bar charts — no chart library dependency to keep bundle size small
- Embed analytics endpoint fetches aging + bottlenecks + chase-impact in parallel via Promise.all

### Phase 5 — Claude skill package

**Goal:** A Claude Code skill that teaches Claude how to integrate ApproveSG into any host codebase, including a "find approval opportunities" scanner mode.

**What was built:**

```
approvesg-skill/
  SKILL.md                        # Trigger conditions, overview, integration + scanner mode instructions
  references/
    api-reference.md              # Every /api/v1 endpoint — methods, schemas, scopes, curl examples
    workflow-patterns.md          # 6 common approval chain recipes with selection guide
    embed-integration.md          # Full embed auth flow, iframe snippets, React/Django examples
    webhook-events.md             # All 4 event shapes, HMAC verification in Node/Python/Go
  assets/
    openapi.yaml                  # OpenAPI 3.0 spec covering all endpoints and schemas
    example-workflows.json        # 6 copy-paste workflow definitions
```

**Integration mode** — triggered by "add approval to X" or "integrate ApproveSG". Claude reads the skill references and writes: API key configuration, workflow definition, submission creation, webhook handler, embed iframe placement.

**Scanner mode** — triggered by "find approval opportunities". Claude greps for status enums, boolean flags, state-machine patterns, and naming signals. For each hit, reads surrounding code, judges if it's a hand-rolled approval chain, and produces a ranked report with integration sketches.

**Key decisions:**
- OpenAPI spec written by hand (matching existing Zod schemas) rather than auto-generated — avoids adding zod-to-openapi dependency for a docs-only artifact
- Skill references written as standalone docs that Claude can read selectively — no need to load the full API surface for simple tasks
- Example workflows cover 6 common patterns (simple manager, two-level, three-level, technical+admin, compliance, content publishing)
- Webhook verification examples in Node.js, Python, and Go for broad host product coverage

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
