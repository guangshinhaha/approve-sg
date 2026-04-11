-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "stuck_since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "chase_reminders" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "next_due_at" TIMESTAMP(3) NOT NULL,
    "last_sent_at" TIMESTAMP(3),
    "send_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chase_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chase_reminders_next_due_at_idx" ON "chase_reminders"("next_due_at");

-- CreateIndex
CREATE INDEX "chase_reminders_resolved_at_idx" ON "chase_reminders"("resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "chase_reminders_submission_id_step_order_key" ON "chase_reminders"("submission_id", "step_order");

-- AddForeignKey
ALTER TABLE "chase_reminders" ADD CONSTRAINT "chase_reminders_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
