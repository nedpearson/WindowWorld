-- AlterTable
ALTER TABLE "lead_scores" ADD COLUMN     "assignedPersona" TEXT,
ADD COLUMN     "budgetSensitivityScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "competitorContext" TEXT,
ADD COLUMN     "financingPropensityScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "personaConfidence" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "premiumIntentScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productDoorsScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productSidingScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productWindowsScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "recommendedOffer" TEXT,
ADD COLUMN     "recommendedTalkTrack" TEXT,
ADD COLUMN     "stormUrgencyScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "trustConcernScore" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "assignedPersona" TEXT,
ADD COLUMN     "budgetSensitivity" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "competitorMentioned" TEXT,
ADD COLUMN     "intentLastUpdated" TIMESTAMP(3),
ADD COLUMN     "lastIntentSignal" TEXT,
ADD COLUMN     "personaConfidence" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "premiumIntent" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productInterestDoors" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productInterestSiding" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productInterestWindows" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "recommendedFollowUpDays" INTEGER,
ADD COLUMN     "recommendedNextAction" TEXT,
ADD COLUMN     "recommendedPitchAngle" TEXT,
ADD COLUMN     "trustConcernLevel" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "lead_intent_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "channel" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_intent_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_definitions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "matchRules" JSONB NOT NULL,
    "talkTrack" TEXT,
    "openingScript" TEXT,
    "discoveryQuestions" TEXT[],
    "financingLanguage" TEXT,
    "objectionHandling" TEXT,
    "closeLanguage" TEXT,
    "recommendedOffer" TEXT,
    "recommendedLanding" TEXT,
    "recommendedAdAngle" TEXT,
    "followUpCadenceDays" INTEGER[],
    "followUpChannels" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_intent_mentions" (
    "id" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "authorHandle" TEXT,
    "contentText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "intentType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "localRelevance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "matchedKeywords" TEXT[],
    "matchedPatterns" TEXT[],
    "competitorsMentioned" TEXT[],
    "geography" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assignedToId" TEXT,
    "recommendedAction" TEXT,
    "recommendedLanding" TEXT,
    "recommendedTalkTrack" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_intent_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_opportunity_signals" (
    "id" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "geography" TEXT,
    "signalStrength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "mentionCount" INTEGER NOT NULL DEFAULT 1,
    "timeWindow" TEXT,
    "summary" TEXT NOT NULL,
    "recommendedCampaign" TEXT,
    "recommendedSegment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_opportunity_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_intent_events_leadId_createdAt_idx" ON "lead_intent_events"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_intent_events_leadId_eventType_idx" ON "lead_intent_events"("leadId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "persona_definitions_slug_key" ON "persona_definitions"("slug");

-- CreateIndex
CREATE INDEX "public_intent_mentions_category_urgency_idx" ON "public_intent_mentions"("category", "urgency");

-- CreateIndex
CREATE INDEX "public_intent_mentions_status_confidence_idx" ON "public_intent_mentions"("status", "confidence");

-- CreateIndex
CREATE INDEX "public_intent_mentions_sourcePlatform_idx" ON "public_intent_mentions"("sourcePlatform");

-- CreateIndex
CREATE INDEX "local_opportunity_signals_signalType_isActive_idx" ON "local_opportunity_signals"("signalType", "isActive");

-- CreateIndex
CREATE INDEX "local_opportunity_signals_category_idx" ON "local_opportunity_signals"("category");

-- CreateIndex
CREATE INDEX "lead_scores_leadId_scoredAt_idx" ON "lead_scores"("leadId", "scoredAt");

-- AddForeignKey
ALTER TABLE "lead_intent_events" ADD CONSTRAINT "lead_intent_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

