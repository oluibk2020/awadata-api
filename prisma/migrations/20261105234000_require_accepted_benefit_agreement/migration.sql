ALTER TABLE "BenefitAgreement"
ADD COLUMN "acceptedById" UUID,
ADD COLUMN "acceptedAt" TIMESTAMP(3);

ALTER TABLE "BenefitAgreement"
ADD CONSTRAINT "BenefitAgreement_acceptedById_fkey"
FOREIGN KEY ("acceptedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BenefitAgreement_acceptedById_idx"
ON "BenefitAgreement"("acceptedById");
