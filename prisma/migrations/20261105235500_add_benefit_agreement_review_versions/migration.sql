ALTER TYPE "BenefitAgreementStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "BenefitAgreementStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "BenefitAgreementStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "BenefitAgreement"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "BenefitAgreement_researchRequestId_key";

CREATE UNIQUE INDEX "BenefitAgreement_researchRequestId_version_key"
ON "BenefitAgreement"("researchRequestId", "version");

CREATE INDEX "BenefitAgreement_researchRequestId_status_version_idx"
ON "BenefitAgreement"("researchRequestId", "status", "version");
