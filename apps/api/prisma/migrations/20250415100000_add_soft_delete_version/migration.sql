-- Add soft delete and optimistic concurrency fields
ALTER TABLE "Company"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Contact"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Deal"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Task"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
