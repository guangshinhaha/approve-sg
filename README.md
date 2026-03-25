# ApproveSG

**Approval Workflows as a Shared Service**

Every MOE product team gets approval workflows out of the box — no product team ever builds approval logic again.

## What is ApproveSG?

ApproveSG is a shared, API-first approval engine that any MOE product can plug into. It handles the universal pattern of submit → route → approve/reject → complete, so individual product teams don't have to rebuild this logic from scratch.

### Key Features

- **API-First**: All functionality exposed via REST API — headless by design
- **Multi-Tenant**: School-level isolation via `school_code` with Row-Level Security
- **Role-Aware**: Approvers assigned by MIMS role (HOD, VP, Principal), not by name
- **Configurable**: Each school defines its own approval chains per workflow type
- **Auditable**: Every action logged with immutable audit trail

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Parents    │     │    SuMS     │     │     HDP     │
│   Gateway    │     │             │     │             │
└──────┬───────┘     └──────┬──────┘     └──────┬──────┘
       │    REST API        │    REST API        │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────┐
│                     ApproveSG                         │
│   Workflow Config · Routing Engine · Notifications    │
│   Audit Trail · MIMS Role Resolution                 │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
                   PostgreSQL
                   (Supabase)
```

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **Auth**: MIMS v2 JWT verification
- **Notifications**: AWS SES for email
- **Deployment**: Vercel (dev) → GCC (production)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase project)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database and MIMS credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000/api`.

## API Endpoints

### Submissions

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/api/submissions`              | Create a new submission  |
| GET    | `/api/submissions/:id`          | Get submission status    |
| POST   | `/api/submissions/:id/approve`  | Approve current step     |
| POST   | `/api/submissions/:id/reject`   | Reject submission        |
| POST   | `/api/submissions/:id/send-back`| Send back to submitter   |

### Workflows

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/workflows`      | List workflows for a school    |
| POST   | `/api/workflows`      | Create workflow config         |
| PUT    | `/api/workflows/:id`  | Update workflow config         |

### Webhooks

| Method | Endpoint           | Description          |
|--------|--------------------|----------------------|
| POST   | `/api/webhooks`    | Register a webhook   |
| DELETE | `/api/webhooks/:id`| Remove a webhook     |

## Project Structure

```
src/
├── app/
│   └── api/              # Next.js API routes
│       ├── submissions/   # Submission CRUD + actions
│       ├── workflows/     # Workflow configuration
│       └── webhooks/      # Webhook registration
├── lib/
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # MIMS JWT verification
│   ├── errors.ts         # Error types
│   ├── routing.ts        # Approval routing engine
│   ├── notifications.ts  # Email notification service
│   └── webhooks.ts       # Webhook dispatch
└── types/
    └── index.ts          # Shared TypeScript types
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Seed data for development
```

## License

Internal — Ministry of Education, Singapore
