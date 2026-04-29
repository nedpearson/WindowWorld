-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MATERIALS', 'PERMITS', 'DISPOSAL', 'LABOR', 'TRAVEL', 'EQUIPMENT', 'OTHER');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'RECEIPT';

-- CreateTable
CREATE TABLE "job_expenses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "documentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "vendor" VARCHAR(255),
    "description" VARCHAR(1000),
    "receiptDate" TIMESTAMP(3),
    "aiParsedData" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_expenses_documentId_key" ON "job_expenses"("documentId");

-- CreateIndex
CREATE INDEX "job_expenses_leadId_idx" ON "job_expenses"("leadId");

-- CreateIndex
CREATE INDEX "job_expenses_organizationId_idx" ON "job_expenses"("organizationId");

-- CreateIndex
CREATE INDEX "job_expenses_createdAt_idx" ON "job_expenses"("createdAt");

-- AddForeignKey
ALTER TABLE "job_expenses" ADD CONSTRAINT "job_expenses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_expenses" ADD CONSTRAINT "job_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_expenses" ADD CONSTRAINT "job_expenses_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_expenses" ADD CONSTRAINT "job_expenses_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
