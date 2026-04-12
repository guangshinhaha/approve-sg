# ApproveSG

**Approval Workflows as a Multi-Tenant SaaS Platform**

A shared, API-first approval engine that any product can plug into. It handles the universal pattern of submit → route through approval steps → approve/reject → notify, so product teams don't rebuild approval logic from scratch.

## Key Features

- **API-First** — all functionality exposed via REST API, headless by design
- **Multi-Tenant** — organization-level isolation, each tenant gets its own workflows, submissions, and API keys
- **Embeddable UI** — iframe-ready pages for inbox, workflow builder, submission timeline, and analytics
- **Configurable Chains** — define multi-step approval chains with role-based routing
- **Chase Engine** — automatically emails approvers every 72 hours when a step is stuck
- **Webhooks** — HMAC-signed callbacks when submissions change state
- **Analytics** — approval aging, bottleneck detection, and chase effectiveness metrics
- **Auditable** — every action logged with immutable audit trail

## Claude Skill — Integrate ApproveSG with AI Assistance

The **ApproveSG Claude Skill** teaches [Claude Code](https://docs.anthropic.com/en/docs/claude-code) how to integrate approval workflows into any codebase. It has two modes:

- **Integration mode** — say "add approval to X" and Claude writes the full integration: API key setup, workflow definition, submission creation, webhook handler, and embed iframe placement
- **Scanner mode** — say "find approval opportunities" and Claude scans your codebase for hand-rolled approval patterns that could be replaced with ApproveSG

### Install the Skill

**Option 1 — Clone this repo** (if you have access):
```bash
git clone https://github.com/guangshinhaha/approve-sg.git
```

The skill lives in the `approvesg-skill/` directory.

**Option 2 — Download just the skill folder:**
```bash
# Download the skill package directly
curl -L https://github.com/guangshinhaha/approve-sg/archive/refs/heads/main.tar.gz | tar xz --strip-components=1 "*/approvesg-skill"
```

### Use the Skill with Claude Code

1. **Copy the skill folder** into your project or a shared location:
   ```bash
   cp -r approvesg-skill/ /path/to/your/project/.claude/skills/approvesg/
   ```

2. **Point Claude Code to it** — add the skill path to your project's `.claude/settings.json`:
   ```json
   {
     "skills": [
       "/path/to/approvesg-skill/SKILL.md"
     ]
   }
   ```

3. **Use it** — in Claude Code, just ask:
   ```
   # Integration mode
   "Add an approval workflow to our purchase order system"
   "Integrate ApproveSG for leave requests"

   # Scanner mode
   "Find approval opportunities in this codebase"
   "Where should we add approval gates?"
   ```

### What's in the Skill Package

```
approvesg-skill/
├── SKILL.md                          # Entry point — trigger conditions + instructions
├── references/
│   ├── api-reference.md              # Every /api/v1 endpoint with curl examples
│   ├── workflow-patterns.md          # 6 approval chain recipes
│   ├── embed-integration.md          # Iframe embed guide with React/Django examples
│   └── webhook-events.md            # Event shapes + HMAC verification (Node/Python/Go)
└── assets/
    ├── openapi.yaml                  # OpenAPI 3.0 spec
    └── example-workflows.json        # 6 copy-paste workflow definitions
```

---

## Architecture

```
Host Products (any SaaS, internal tool, etc.)
       │
       │  REST API (Bearer asg_live_...)
       ▼
┌──────────────────────────────────────────────┐
│              ApproveSG Engine                  │
│                                                │
│  API Key Auth ─► Routing Engine ─► Webhooks   │
│                      │                         │
│              Chase Engine (72h)                │
│              Email Notifications               │
│              Analytics                         │
└───────────────────────┬──────────────────────┘
                        │
                   PostgreSQL
                   (Railway)
```

### Embeddable UI Surfaces

Drop these iframes into your product — authenticated via short-lived embed tokens:

| Page | URL | Description |
|------|-----|-------------|
| Inbox | `/embed/inbox` | "What's waiting on me" — submissions pending the user's review |
| Submission | `/embed/submissions/:id` | Timeline view with step history, stuckWith info, chase counts |
| Workflow Builder | `/embed/workflow-builder` | Drag-and-drop approval chain editor |
| Analytics | `/embed/analytics` | Aging trends, bottleneck steps, chase effectiveness |

All embed pages support `?theme=primaryColor,logoUrl` for brand matching.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: PostgreSQL via Prisma 5 ORM
- **Email**: AWS SES (no-ops gracefully when not configured)
- **Deployment**: Railway (app + Postgres + chase-cron service)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Setup

```bash
# Install dependencies
npm ci

# Set up local Postgres
createdb approvesg
cp .env.example .env  # edit with your DATABASE_URL

# Run migrations and seed demo data
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
```

The app will be at `http://localhost:3000`. The API is at `http://localhost:3000/api/v1`.

### Demo Login

Visit `http://localhost:3000/login` and pick a demo persona (seeded by `npm run db:seed`).

## API Overview

All `/api/v1/*` endpoints require an API key: `Authorization: Bearer asg_live_...`

### Core Endpoints

| Method | Endpoint | Scope | Description |
|--------|----------|-------|-------------|
| POST | `/api/v1/workflows` | `workflows:write` | Create approval chain |
| GET | `/api/v1/workflows` | `workflows:read` | List workflows |
| PUT | `/api/v1/workflows/:id` | `workflows:write` | Update workflow |
| POST | `/api/v1/submissions` | `submissions:write` | Create submission |
| GET | `/api/v1/submissions` | `submissions:read` | List submissions |
| GET | `/api/v1/submissions/:id` | `submissions:read` | Get with `stuckWith` field |
| POST | `/api/v1/submissions/:id/approve` | `submissions:approve` | Approve current step |
| POST | `/api/v1/submissions/:id/reject` | `submissions:approve` | Reject submission |
| POST | `/api/v1/submissions/:id/send-back` | `submissions:approve` | Send back for revision |
| POST | `/api/v1/webhooks` | `webhooks:write` | Register webhook |
| POST | `/api/v1/embed-tokens` | `embed:write` | Mint embed token |
| GET | `/api/v1/analytics/aging` | `analytics:read` | Time-to-approve stats |
| GET | `/api/v1/analytics/bottlenecks` | `analytics:read` | Slowest steps ranked |
| GET | `/api/v1/analytics/chase-impact` | `analytics:read` | Chase reminder effectiveness |

Full API reference with request/response schemas: [`approvesg-skill/references/api-reference.md`](approvesg-skill/references/api-reference.md)

## Project Structure

```
src/
├── app/
│   ├── api/                # Dashboard API routes (session auth)
│   ├── api/v1/             # External API routes (API key auth)
│   ├── api/embed/          # Embed API routes (embed token auth)
│   ├── (dashboard)/        # Dashboard UI pages
│   └── embed/              # Embeddable iframe pages
├── components/             # React components
├── lib/
│   ├── auth.ts             # Session + API key auth
│   ├── routing.ts          # Approval state machine
│   ├── chase.ts            # Chase reminder engine
│   ├── analytics.ts        # Aging/bottleneck computation
│   ├── notifications.ts    # Email via AWS SES
│   ├── webhooks.ts         # HMAC-signed webhook dispatch
│   ├── embed-token.ts      # Embed JWT sign/verify
│   └── embed-auth.ts       # Embed page auth helpers
└── types/
    └── index.ts
prisma/
├── schema.prisma
└── seed.ts
approvesg-skill/            # Claude Code skill package
```

## License

MIT
