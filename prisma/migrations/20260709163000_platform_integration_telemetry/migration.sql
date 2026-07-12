-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('FACTUS');

-- CreateEnum
CREATE TYPE "IntegrationOperation" AS ENUM ('HEALTH_CHECK', 'AUTHENTICATION', 'API_REQUEST');

-- CreateEnum
CREATE TYPE "IntegrationLogStatus" AS ENUM ('SUCCESS', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "platform_integration_logs" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "operation" "IntegrationOperation" NOT NULL,
    "status" "IntegrationLogStatus" NOT NULL,
    "httpStatus" INTEGER,
    "errorCode" TEXT,
    "message" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_integration_logs_provider_createdAt_idx" ON "platform_integration_logs"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "platform_integration_logs_status_createdAt_idx" ON "platform_integration_logs"("status", "createdAt");
