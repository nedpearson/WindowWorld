-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "website" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "googleMapsUrl" TEXT,
    "territory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_pages" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "title" TEXT,
    "contentText" TEXT,
    "keyMessages" JSONB,
    "ctaText" TEXT,
    "financingOffer" TEXT,
    "warrantyClaimText" TEXT,
    "lastFetched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_social_profiles" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "handle" TEXT,
    "followerCount" INTEGER,
    "postFrequency" TEXT,
    "primaryThemes" JSONB,
    "toneNotes" TEXT,
    "lastAnalyzed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_social_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_social_posts" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "profileId" TEXT,
    "platform" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT[],
    "engagementNotes" TEXT,
    "creativeTheme" TEXT,
    "productFocus" TEXT,
    "financingMention" BOOLEAN NOT NULL DEFAULT false,
    "stormMention" BOOLEAN NOT NULL DEFAULT false,
    "urgencyHook" BOOLEAN NOT NULL DEFAULT false,
    "publicCommentInsights" JSONB,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_insights" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT,
    "source" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "reviewText" TEXT,
    "sentiment" TEXT NOT NULL,
    "topicTags" TEXT[],
    "productMentioned" TEXT,
    "reviewerType" TEXT,
    "publicUrl" TEXT,
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_thread_insights" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "subreddit" TEXT,
    "threadTitle" TEXT,
    "threadContent" TEXT,
    "sentiment" TEXT NOT NULL,
    "topicTags" TEXT[],
    "productFocus" TEXT,
    "intentSignals" TEXT[],
    "keyQuestions" JSONB,
    "competitorMentions" TEXT[],
    "threadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_thread_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_clusters" (
    "id" TEXT NOT NULL,
    "clusterName" TEXT NOT NULL,
    "productScope" TEXT NOT NULL,
    "themeType" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "sentimentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keyPhrases" TEXT[],
    "sourceSummary" JSONB,
    "actionableNote" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_intent_signals" (
    "id" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "sessionId" TEXT,
    "leadId" TEXT,
    "pageUrl" TEXT,
    "productSignal" TEXT,
    "financingSignal" BOOLEAN NOT NULL DEFAULT false,
    "stormSignal" BOOLEAN NOT NULL DEFAULT false,
    "urgencySignal" BOOLEAN NOT NULL DEFAULT false,
    "sourceChannel" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_intent_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_intent_profiles" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "behaviorSegment" TEXT,
    "productSignals" TEXT[],
    "urgencyLevel" TEXT NOT NULL DEFAULT 'LOW',
    "pageViewCount" INTEGER NOT NULL DEFAULT 1,
    "financingPageVisit" BOOLEAN NOT NULL DEFAULT false,
    "quotePageVisit" BOOLEAN NOT NULL DEFAULT false,
    "sourceChannel" TEXT,
    "retargetingAngles" JSONB,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anonymous_intent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battlecards" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "positioning" TEXT,
    "keyClaims" JSONB,
    "pricingLanguage" TEXT,
    "financingOffers" TEXT,
    "warrantyNotes" TEXT,
    "ctaStrategy" TEXT,
    "reviewStrengths" JSONB,
    "reviewWeaknesses" JSONB,
    "messagingGaps" JSONB,
    "facebookNotes" TEXT,
    "instagramNotes" TEXT,
    "ourCounterPitch" TEXT,
    "talkTrack" TEXT,
    "objectionResponses" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battlecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_angles" (
    "id" TEXT NOT NULL,
    "segmentTarget" TEXT NOT NULL,
    "productFocus" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "headline" TEXT,
    "bodyText" TEXT,
    "ctaText" TEXT,
    "visualConcept" TEXT,
    "landingPagePath" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_angles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_creative_patterns" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "creativeTheme" TEXT NOT NULL,
    "productFocus" TEXT NOT NULL,
    "captionStyle" TEXT,
    "visualDescription" TEXT,
    "performanceNotes" TEXT,
    "hookExample" TEXT,
    "competitorUsageCount" INTEGER NOT NULL DEFAULT 0,
    "recommendationLevel" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_creative_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objection_patterns" (
    "id" TEXT NOT NULL,
    "objectionText" TEXT NOT NULL,
    "objectionCategory" TEXT NOT NULL,
    "productFocus" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "sourceTypes" TEXT[],
    "responseScript" TEXT,
    "closeScript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objection_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_opportunities" (
    "id" TEXT NOT NULL,
    "opportunityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productScope" TEXT NOT NULL,
    "targetSegment" TEXT,
    "recommendedMessage" TEXT,
    "channel" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "evidenceSources" JSONB,
    "isActedOn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitors_slug_key" ON "competitors"("slug");

-- CreateIndex
CREATE INDEX "competitor_pages_competitorId_idx" ON "competitor_pages"("competitorId");

-- CreateIndex
CREATE INDEX "competitor_social_profiles_competitorId_platform_idx" ON "competitor_social_profiles"("competitorId", "platform");

-- CreateIndex
CREATE INDEX "competitor_social_posts_competitorId_platform_idx" ON "competitor_social_posts"("competitorId", "platform");

-- CreateIndex
CREATE INDEX "review_insights_competitorId_sentiment_idx" ON "review_insights"("competitorId", "sentiment");

-- CreateIndex
CREATE INDEX "review_insights_source_idx" ON "review_insights"("source");

-- CreateIndex
CREATE INDEX "forum_thread_insights_source_productFocus_idx" ON "forum_thread_insights"("source", "productFocus");

-- CreateIndex
CREATE INDEX "topic_clusters_productScope_themeType_idx" ON "topic_clusters"("productScope", "themeType");

-- CreateIndex
CREATE INDEX "buyer_intent_signals_leadId_idx" ON "buyer_intent_signals"("leadId");

-- CreateIndex
CREATE INDEX "buyer_intent_signals_sessionId_idx" ON "buyer_intent_signals"("sessionId");

-- CreateIndex
CREATE INDEX "buyer_intent_signals_signalType_createdAt_idx" ON "buyer_intent_signals"("signalType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_intent_profiles_sessionId_key" ON "anonymous_intent_profiles"("sessionId");

-- CreateIndex
CREATE INDEX "anonymous_intent_profiles_behaviorSegment_idx" ON "anonymous_intent_profiles"("behaviorSegment");

-- CreateIndex
CREATE UNIQUE INDEX "battlecards_competitorId_key" ON "battlecards"("competitorId");

-- CreateIndex
CREATE INDEX "campaign_angles_segmentTarget_channel_idx" ON "campaign_angles"("segmentTarget", "channel");

-- CreateIndex
CREATE INDEX "social_creative_patterns_platform_recommendationLevel_idx" ON "social_creative_patterns"("platform", "recommendationLevel");

-- CreateIndex
CREATE INDEX "objection_patterns_objectionCategory_idx" ON "objection_patterns"("objectionCategory");

-- CreateIndex
CREATE INDEX "messaging_opportunities_priority_isActedOn_idx" ON "messaging_opportunities"("priority", "isActedOn");

-- CreateIndex
CREATE INDEX "appointments_createdById_idx" ON "appointments"("createdById");

-- CreateIndex
CREATE INDEX "contacts_leadId_idx" ON "contacts"("leadId");

-- CreateIndex
CREATE INDEX "contacts_propertyId_idx" ON "contacts"("propertyId");

-- CreateIndex
CREATE INDEX "documents_propertyId_idx" ON "documents"("propertyId");

-- CreateIndex
CREATE INDEX "inspections_leadId_idx" ON "inspections"("leadId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");

-- CreateIndex
CREATE INDEX "invoices_leadId_idx" ON "invoices"("leadId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "measurements_status_idx" ON "measurements"("status");

-- CreateIndex
CREATE INDEX "openings_inspectionId_idx" ON "openings"("inspectionId");

-- CreateIndex
CREATE INDEX "openings_propertyId_idx" ON "openings"("propertyId");

-- CreateIndex
CREATE INDEX "properties_organizationId_idx" ON "properties"("organizationId");

-- CreateIndex
CREATE INDEX "proposals_leadId_idx" ON "proposals"("leadId");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE INDEX "quotes_leadId_idx" ON "quotes"("leadId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_pages" ADD CONSTRAINT "competitor_pages_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_social_profiles" ADD CONSTRAINT "competitor_social_profiles_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_social_posts" ADD CONSTRAINT "competitor_social_posts_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_social_posts" ADD CONSTRAINT "competitor_social_posts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "competitor_social_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_insights" ADD CONSTRAINT "review_insights_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battlecards" ADD CONSTRAINT "battlecards_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
