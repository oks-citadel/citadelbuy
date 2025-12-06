-- Add privacy and consent tracking tables for GDPR/CCPA compliance

-- Create ConsentLog table to track user consent history
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataProcessing" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartySharing" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- Create DataDeletionRequest table to track deletion requests
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- Create DataExportRequest table to track export requests
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- Create AgreedTerms table to track which privacy policy/terms version user agreed to
CREATE TABLE "AgreedTerms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL,
    "cookiePolicyVersion" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreedTerms_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");
CREATE INDEX "ConsentLog_createdAt_idx" ON "ConsentLog"("createdAt");
CREATE INDEX "DataDeletionRequest_userId_idx" ON "DataDeletionRequest"("userId");
CREATE INDEX "DataDeletionRequest_status_idx" ON "DataDeletionRequest"("status");
CREATE INDEX "DataExportRequest_userId_idx" ON "DataExportRequest"("userId");
CREATE INDEX "DataExportRequest_status_idx" ON "DataExportRequest"("status");
CREATE INDEX "AgreedTerms_userId_idx" ON "AgreedTerms"("userId");

-- Add foreign key constraints
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgreedTerms" ADD CONSTRAINT "AgreedTerms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add deletedAt field to User table for soft delete support
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "processingRestricted" BOOLEAN NOT NULL DEFAULT false;
