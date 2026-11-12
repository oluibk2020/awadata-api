CREATE TYPE "AuditEventType" AS ENUM (
  'RESEARCH_REQUEST_SUBMITTED',
  'GOVERNANCE_DECISION_RECORDED',
  'CONSENT_WITHDRAWN',
  'ACCESS_AUTHORIZATION_ALLOWED',
  'ACCESS_AUTHORIZATION_DENIED',
  'DATA_ACCESS_EXECUTED',
  'DATA_ACCESS_EXECUTION_DENIED',
  'BENEFIT_AGREEMENT_CREATED',
  'BENEFIT_AGREEMENT_UPDATED'
);

CREATE TYPE "AuditOutcome" AS ENUM ('ALLOWED', 'DENIED', 'SUCCESS', 'FAILURE');

ALTER TABLE "AuditEvent"
ADD COLUMN "eventType" "AuditEventType" NOT NULL DEFAULT 'RESEARCH_REQUEST_SUBMITTED',
ADD COLUMN "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN "reasonCode" TEXT,
ADD COLUMN "researchRequestId" UUID,
ADD COLUMN "datasetId" UUID,
ADD COLUMN "operation" "ConsentOperation";

ALTER TABLE "AuditEvent"
ALTER COLUMN "eventType" DROP DEFAULT,
ALTER COLUMN "outcome" DROP DEFAULT;

ALTER TABLE "AuditEvent"
ADD CONSTRAINT "AuditEvent_researchRequestId_fkey"
FOREIGN KEY ("researchRequestId") REFERENCES "ResearchRequest"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "AuditEvent_datasetId_fkey"
FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AuditEvent_researchRequestId_occurredAt_idx"
ON "AuditEvent"("researchRequestId", "occurredAt");

CREATE INDEX "AuditEvent_datasetId_occurredAt_idx"
ON "AuditEvent"("datasetId", "occurredAt");

CREATE TYPE "BenefitAgreementStatus" AS ENUM ('COMMITTED', 'FULFILLED', 'CANCELLED');

ALTER TABLE "BenefitAgreement"
ADD COLUMN "communityId" UUID,
ADD COLUMN "researcherId" UUID,
ADD COLUMN "commitmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "status" "BenefitAgreementStatus" NOT NULL DEFAULT 'COMMITTED',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "BenefitAgreement" agreement
SET "communityId" = dataset."communityId",
    "researcherId" = request."researcherId"
FROM "ResearchRequest" request
JOIN "Dataset" dataset ON dataset."id" = request."datasetId"
WHERE agreement."researchRequestId" = request."id";

ALTER TABLE "BenefitAgreement"
ALTER COLUMN "communityId" SET NOT NULL,
ALTER COLUMN "researcherId" SET NOT NULL;

ALTER TABLE "BenefitAgreement"
ADD CONSTRAINT "BenefitAgreement_communityId_fkey"
FOREIGN KEY ("communityId") REFERENCES "Community"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "BenefitAgreement_researcherId_fkey"
FOREIGN KEY ("researcherId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
