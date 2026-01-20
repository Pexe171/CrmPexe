-- apps/api/prisma/migrations/20250102000000_add_health_check/migration.sql
-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);