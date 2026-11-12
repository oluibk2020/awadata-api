-- Make pre-seeded research requests usable by the focused PoC.
ALTER TABLE "ResearchRequest"
ALTER COLUMN "organisationId" DROP NOT NULL,
ALTER COLUMN "proposedExpiry" DROP NOT NULL;

ALTER TABLE "ResearchRequest"
ADD COLUMN "requestedConsentOperations" "ConsentOperation"[] NOT NULL
  DEFAULT ARRAY[]::"ConsentOperation"[];

ALTER TABLE "ResearchRequest"
ALTER COLUMN "requestedConsentOperations" DROP DEFAULT;

ALTER TABLE "GovernanceDecision"
ADD COLUMN "approvedOperations" "ConsentOperation"[] NOT NULL
  DEFAULT ARRAY[]::"ConsentOperation"[];

ALTER TABLE "GovernanceDecision"
ALTER COLUMN "approvedOperations" DROP DEFAULT;

CREATE UNIQUE INDEX "GovernanceDecision_researchRequestId_key"
ON "GovernanceDecision"("researchRequestId");
