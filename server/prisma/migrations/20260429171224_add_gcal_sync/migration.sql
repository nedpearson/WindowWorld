-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gcalAccessToken" TEXT,
ADD COLUMN     "gcalCalendarId" TEXT,
ADD COLUMN     "gcalConnectedAt" TIMESTAMP(3),
ADD COLUMN     "gcalRefreshToken" TEXT,
ADD COLUMN     "gcalSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gcalTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "twilioSid" TEXT,
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "errorCode" TEXT,
    "activityId" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communication_logs_twilioSid_key" ON "communication_logs"("twilioSid");

-- CreateIndex
CREATE UNIQUE INDEX "communication_logs_activityId_key" ON "communication_logs"("activityId");

-- CreateIndex
CREATE INDEX "communication_logs_leadId_createdAt_idx" ON "communication_logs"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_logs_organizationId_createdAt_idx" ON "communication_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_logs_userId_idx" ON "communication_logs"("userId");

-- CreateIndex
CREATE INDEX "communication_logs_type_status_idx" ON "communication_logs"("type", "status");

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
