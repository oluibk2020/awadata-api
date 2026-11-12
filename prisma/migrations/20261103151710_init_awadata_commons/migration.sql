-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'RESEARCHER', 'PARTICIPANT', 'COMMUNITY_ADMIN', 'GOVERNANCE_MEMBER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('MEMBER', 'ADMIN', 'GOVERNANCE_MEMBER');

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ConsentPermissionType" AS ENUM ('ACADEMIC_RESEARCH', 'PUBLIC_HEALTH_RESEARCH', 'COMMERCIAL_RESEARCH', 'AI_MODEL_TRAINING', 'IDENTIFIABLE_DATA', 'AGGREGATE_DATA', 'THIRD_PARTY_SHARING');

-- CreateEnum
CREATE TYPE "ResearchPurpose" AS ENUM ('ACADEMIC', 'PUBLIC_HEALTH', 'COMMERCIAL', 'AI_TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "DataOperation" AS ENUM ('AGGREGATE_ANALYSIS', 'RECORD_LEVEL_ANALYSIS', 'IDENTIFIABLE_ACCESS', 'EXPORT', 'MODEL_TRAINING', 'THIRD_PARTY_SHARING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GovernanceOutcome" AS ENUM ('APPROVED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'CONSENT_CREATED', 'CONSENT_WITHDRAWN', 'RESEARCH_REQUEST_CREATED', 'GOVERNANCE_DECISION_RECORDED', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'DATA_ACCESS_EXECUTED', 'GRANT_REVOKED', 'BENEFIT_DELIVERY_RECORDED');

-- CreateEnum
CREATE TYPE "BenefitStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PARTICIPANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMembership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DatasetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "recordedById" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentPermission" (
    "id" UUID NOT NULL,
    "consentId" UUID NOT NULL,
    "permission" "ConsentPermissionType" NOT NULL,
    "allowed" BOOLEAN NOT NULL,

    CONSTRAINT "ConsentPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRequest" (
    "id" UUID NOT NULL,
    "researcherId" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purpose" "ResearchPurpose" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedOperations" "DataOperation"[],
    "proposedExpiry" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceDecision" (
    "id" UUID NOT NULL,
    "researchRequestId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "decisionMakerId" UUID NOT NULL,
    "outcome" "GovernanceOutcome" NOT NULL,
    "reason" TEXT NOT NULL,
    "conditions" JSONB,
    "policyVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessGrant" (
    "id" UUID NOT NULL,
    "researchRequestId" UUID NOT NULL,
    "researcherId" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "operations" "DataOperation"[],
    "status" "GrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitAgreement" (
    "id" UUID NOT NULL,
    "researchRequestId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitDelivery" (
    "id" UUID NOT NULL,
    "benefitAgreementId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "status" "BenefitStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "evidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMembership_userId_communityId_key" ON "CommunityMembership"("userId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_communityId_name_version_key" ON "Dataset"("communityId", "name", "version");

-- CreateIndex
CREATE INDEX "Participant_datasetId_idx" ON "Participant"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_communityId_subjectCode_key" ON "Participant"("communityId", "subjectCode");

-- CreateIndex
CREATE INDEX "Consent_participantId_datasetId_status_idx" ON "Consent"("participantId", "datasetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentPermission_consentId_permission_key" ON "ConsentPermission"("consentId", "permission");

-- CreateIndex
CREATE INDEX "ResearchRequest_datasetId_status_idx" ON "ResearchRequest"("datasetId", "status");

-- CreateIndex
CREATE INDEX "ResearchRequest_researcherId_idx" ON "ResearchRequest"("researcherId");

-- CreateIndex
CREATE INDEX "GovernanceDecision_researchRequestId_createdAt_idx" ON "GovernanceDecision"("researchRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessGrant_researcherId_datasetId_status_idx" ON "AccessGrant"("researcherId", "datasetId", "status");

-- CreateIndex
CREATE INDEX "AuditEvent_resource_resourceId_occurredAt_idx" ON "AuditEvent"("resource", "resourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_occurredAt_idx" ON "AuditEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitAgreement_researchRequestId_key" ON "BenefitAgreement"("researchRequestId");

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMembership" ADD CONSTRAINT "CommunityMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentPermission" ADD CONSTRAINT "ConsentPermission_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "Consent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRequest" ADD CONSTRAINT "ResearchRequest_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRequest" ADD CONSTRAINT "ResearchRequest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRequest" ADD CONSTRAINT "ResearchRequest_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_researchRequestId_fkey" FOREIGN KEY ("researchRequestId") REFERENCES "ResearchRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_decisionMakerId_fkey" FOREIGN KEY ("decisionMakerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_researchRequestId_fkey" FOREIGN KEY ("researchRequestId") REFERENCES "ResearchRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitAgreement" ADD CONSTRAINT "BenefitAgreement_researchRequestId_fkey" FOREIGN KEY ("researchRequestId") REFERENCES "ResearchRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitDelivery" ADD CONSTRAINT "BenefitDelivery_benefitAgreementId_fkey" FOREIGN KEY ("benefitAgreementId") REFERENCES "BenefitAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
