CREATE TABLE "SyntheticObservation" (
    "id" UUID NOT NULL,
    "datasetId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "wellbeingScore" INTEGER NOT NULL,
    "sleepQualityScore" INTEGER NOT NULL,
    "stressLevelScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyntheticObservation_datasetId_participantId_key"
ON "SyntheticObservation"("datasetId", "participantId");

CREATE INDEX "SyntheticObservation_datasetId_idx"
ON "SyntheticObservation"("datasetId");

ALTER TABLE "SyntheticObservation"
ADD CONSTRAINT "SyntheticObservation_datasetId_fkey"
FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SyntheticObservation"
ADD CONSTRAINT "SyntheticObservation_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
