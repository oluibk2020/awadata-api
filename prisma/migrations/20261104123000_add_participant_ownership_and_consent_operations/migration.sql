-- AlterTable
ALTER TABLE "Participant"
ADD COLUMN "userId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_userId_key" ON "Participant"("userId");

-- AddForeignKey
ALTER TABLE "Participant"
ADD CONSTRAINT "Participant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ConsentOperation" AS ENUM (
  'ACADEMIC_AGGREGATE_RESEARCH',
  'IDENTIFIABLE_RECORD_ACCESS',
  'COMMERCIAL_AI_TRAINING'
);

-- AlterTable
ALTER TABLE "Consent"
ADD COLUMN "purpose" "ResearchPurpose" NOT NULL DEFAULT 'ACADEMIC';

-- AlterTable
ALTER TABLE "ConsentPermission"
ADD COLUMN "operation" "ConsentOperation" NOT NULL DEFAULT 'ACADEMIC_AGGREGATE_RESEARCH';

-- CreateIndex
CREATE UNIQUE INDEX "ConsentPermission_consentId_operation_key"
ON "ConsentPermission"("consentId", "operation");
