-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'sent_back');
CREATE TYPE "ActionType" AS ENUM ('approved', 'rejected', 'sent_back');

-- CreateTable: workflows
CREATE TABLE "workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_code" VARCHAR(10) NOT NULL,
    "workflow_type" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "steps" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: submissions
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "school_code" VARCHAR(10) NOT NULL,
    "external_ref" VARCHAR(255),
    "external_type" VARCHAR(100),
    "payload" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "submitted_by" VARCHAR(255) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: approval_actions
CREATE TABLE "approval_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "action" "ActionType" NOT NULL,
    "actor" VARCHAR(255) NOT NULL,
    "actor_role" VARCHAR(100),
    "comments" TEXT,
    "acted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: webhook_registrations
CREATE TABLE "webhook_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_code" VARCHAR(10) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "events" VARCHAR(100)[] NOT NULL,
    "secret" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_registrations_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "workflows_school_code_workflow_type_key" ON "workflows"("school_code", "workflow_type");
CREATE INDEX "workflows_school_code_idx" ON "workflows"("school_code");

CREATE INDEX "submissions_school_code_idx" ON "submissions"("school_code");
CREATE INDEX "submissions_workflow_id_idx" ON "submissions"("workflow_id");
CREATE INDEX "submissions_submitted_by_idx" ON "submissions"("submitted_by");
CREATE INDEX "submissions_status_idx" ON "submissions"("status");
-- Composite indexes for common queries
CREATE INDEX "submissions_school_code_status_idx" ON "submissions"("school_code", "status");
CREATE INDEX "submissions_school_code_workflow_id_status_idx" ON "submissions"("school_code", "workflow_id", "status");

CREATE INDEX "approval_actions_submission_id_idx" ON "approval_actions"("submission_id");

CREATE INDEX "webhook_registrations_school_code_idx" ON "webhook_registrations"("school_code");

-- Foreign keys
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_submission_id_fkey"
    FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Row-Level Security (RLS) Policies
-- Defense-in-depth: even if app-level checks fail, DB enforces
-- school_code isolation. Requires Supabase auth context.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_registrations" ENABLE ROW LEVEL SECURITY;

-- Workflows: users can only see their own school's workflows
CREATE POLICY "workflows_school_isolation" ON "workflows"
    FOR ALL
    USING (school_code = current_setting('app.current_school_code', true))
    WITH CHECK (school_code = current_setting('app.current_school_code', true));

-- Submissions: users can only see their own school's submissions
CREATE POLICY "submissions_school_isolation" ON "submissions"
    FOR ALL
    USING (school_code = current_setting('app.current_school_code', true))
    WITH CHECK (school_code = current_setting('app.current_school_code', true));

-- Approval actions: accessible only via submission's school_code
CREATE POLICY "approval_actions_school_isolation" ON "approval_actions"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "submissions"
            WHERE "submissions"."id" = "approval_actions"."submission_id"
            AND "submissions"."school_code" = current_setting('app.current_school_code', true)
        )
    );

-- Webhook registrations: school-level isolation
CREATE POLICY "webhook_registrations_school_isolation" ON "webhook_registrations"
    FOR ALL
    USING (school_code = current_setting('app.current_school_code', true))
    WITH CHECK (school_code = current_setting('app.current_school_code', true));

-- Service role bypasses RLS (for background jobs, admin operations)
-- In Supabase, the service_role key automatically bypasses RLS.
-- For direct connections, grant bypass to the service user:
-- ALTER ROLE service_role BYPASSRLS;
