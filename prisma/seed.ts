import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient();

const DEMO_PASSWORD_ENV = "DEMO_SEED_PASSWORD";
const demoPassword = process.env[DEMO_PASSWORD_ENV];

if (!demoPassword) {
  throw new Error(
    `${DEMO_PASSWORD_ENV} is required to seed the isolated demo environment`,
  );
}

const ids = {
  admin: "10000000-0000-4000-8000-000000000001",
  researcher: "10000000-0000-4000-8000-000000000002",
  governance: "10000000-0000-4000-8000-000000000003",
  participantA: "10000000-0000-4000-8000-000000000004",
  participantB: "10000000-0000-4000-8000-000000000005",
  participantC: "10000000-0000-4000-8000-000000000006",
  auditor: "10000000-0000-4000-8000-000000000007",
  community: "20000000-0000-4000-8000-000000000001",
  dataset: "30000000-0000-4000-8000-000000000001",
  participantRecordA: "40000000-0000-4000-8000-000000000001",
  participantRecordB: "40000000-0000-4000-8000-000000000002",
  participantRecordC: "40000000-0000-4000-8000-000000000003",
  consentA: "50000000-0000-4000-8000-000000000001",
  consentB: "50000000-0000-4000-8000-000000000002",
  consentC: "50000000-0000-4000-8000-000000000003",
  request: "60000000-0000-4000-8000-000000000001",
  decision: "70000000-0000-4000-8000-000000000001",
  benefit: "80000000-0000-4000-8000-000000000001",
} as const;

const accounts = [
  {
    id: ids.admin,
    email: "platform-admin@awadata.demo",
    firstName: "Demo",
    lastName: "Platform Admin",
    role: "PLATFORM_ADMIN" as const,
  },
  {
    id: ids.researcher,
    email: "researcher@awadata.demo",
    firstName: "Demo",
    lastName: "Researcher",
    role: "RESEARCHER" as const,
  },
  {
    id: ids.governance,
    email: "governance@awadata.demo",
    firstName: "Demo",
    lastName: "Governance Member",
    role: "GOVERNANCE_MEMBER" as const,
  },
  {
    id: ids.participantA,
    email: "participant-a@awadata.demo",
    firstName: "Demo",
    lastName: "Participant A",
    role: "PARTICIPANT" as const,
  },
  {
    id: ids.participantB,
    email: "participant-b@awadata.demo",
    firstName: "Demo",
    lastName: "Participant B",
    role: "PARTICIPANT" as const,
  },
  {
    id: ids.participantC,
    email: "participant-c@awadata.demo",
    firstName: "Demo",
    lastName: "Participant C",
    role: "PARTICIPANT" as const,
  },
  {
    id: ids.auditor,
    email: "auditor@awadata.demo",
    firstName: "Demo",
    lastName: "Auditor",
    role: "AUDITOR" as const,
  },
];

async function seed() {
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        passwordHash,
        isActive: true,
        isBanned: false,
      },
      create: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        passwordHash,
      },
    });
  }

  await prisma.community.upsert({
    where: { id: ids.community },
    update: {},
    create: {
      id: ids.community,
      name: "AwaData Demo Community",
      description: "Synthetic community for the AwaData Commons PoC.",
      country: "Synthetic",
      region: "Synthetic",
    },
  });

  await prisma.dataset.upsert({
    where: { id: ids.dataset },
    update: {},
    create: {
      id: ids.dataset,
      communityId: ids.community,
      name: "Synthetic Community Mental Health Research Dataset",
      description: "Synthetic demonstration data only. No real participant records.",
      status: "ACTIVE",
    },
  });

  await prisma.communityMembership.upsert({
    where: {
      userId_communityId: {
        userId: ids.governance,
        communityId: ids.community,
      },
    },
    update: { role: "GOVERNANCE_MEMBER" },
    create: {
      userId: ids.governance,
      communityId: ids.community,
      role: "GOVERNANCE_MEMBER",
    },
  });

  const participantRecords = [
    { id: ids.participantRecordA, userId: ids.participantA, subjectCode: "PARTICIPANT-A" },
    { id: ids.participantRecordB, userId: ids.participantB, subjectCode: "PARTICIPANT-B" },
    { id: ids.participantRecordC, userId: ids.participantC, subjectCode: "PARTICIPANT-C" },
  ];

  for (const participant of participantRecords) {
    await prisma.participant.upsert({
      where: { id: participant.id },
      update: {},
      create: {
        id: participant.id,
        userId: participant.userId,
        communityId: ids.community,
        datasetId: ids.dataset,
        subjectCode: participant.subjectCode,
      },
    });
  }

  const syntheticObservations = [
    {
      id: "90000000-0000-4000-8000-000000000001",
      participantId: ids.participantRecordA,
      wellbeingScore: 72,
      sleepQualityScore: 68,
      stressLevelScore: 31,
    },
    {
      id: "90000000-0000-4000-8000-000000000002",
      participantId: ids.participantRecordB,
      wellbeingScore: 81,
      sleepQualityScore: 74,
      stressLevelScore: 24,
    },
    {
      id: "90000000-0000-4000-8000-000000000003",
      participantId: ids.participantRecordC,
      wellbeingScore: 64,
      sleepQualityScore: 59,
      stressLevelScore: 42,
    },
  ];

  for (const observation of syntheticObservations) {
    await prisma.syntheticObservation.upsert({
      where: {
        datasetId_participantId: {
          datasetId: ids.dataset,
          participantId: observation.participantId,
        },
      },
      update: {
        wellbeingScore: observation.wellbeingScore,
        sleepQualityScore: observation.sleepQualityScore,
        stressLevelScore: observation.stressLevelScore,
      },
      create: {
        id: observation.id,
        datasetId: ids.dataset,
        participantId: observation.participantId,
        wellbeingScore: observation.wellbeingScore,
        sleepQualityScore: observation.sleepQualityScore,
        stressLevelScore: observation.stressLevelScore,
      },
    });
  }

  const permissions = [
    { operation: "ACADEMIC_AGGREGATE_RESEARCH" as const, permission: "ACADEMIC_RESEARCH" as const, allowed: true },
    { operation: "IDENTIFIABLE_RECORD_ACCESS" as const, permission: "IDENTIFIABLE_DATA" as const, allowed: false },
    { operation: "COMMERCIAL_AI_TRAINING" as const, permission: "AI_MODEL_TRAINING" as const, allowed: false },
  ];

  const consents = [
    { id: ids.consentA, participantId: ids.participantRecordA, recorderId: ids.participantA },
    { id: ids.consentB, participantId: ids.participantRecordB, recorderId: ids.participantB },
    { id: ids.consentC, participantId: ids.participantRecordC, recorderId: ids.participantC },
  ];

  for (const consent of consents) {
    await prisma.consent.upsert({
      where: { id: consent.id },
      update: {},
      create: {
        id: consent.id,
        participantId: consent.participantId,
        datasetId: ids.dataset,
        recordedById: consent.recorderId,
        purpose: "ACADEMIC",
        version: 1,
        status: "ACTIVE",
        permissions: { create: permissions },
      },
    });
  }

  await prisma.researchRequest.upsert({
    where: { id: ids.request },
    update: {},
    create: {
      id: ids.request,
      researcherId: ids.researcher,
      datasetId: ids.dataset,
      title: "Synthetic aggregate community study",
      description: "Academic evaluation of synthetic aggregate patterns.",
      purpose: "ACADEMIC",
      status: "PENDING",
      requestedOperations: [],
      requestedConsentOperations: [
        "ACADEMIC_AGGREGATE_RESEARCH",
        "IDENTIFIABLE_RECORD_ACCESS",
        "COMMERCIAL_AI_TRAINING",
      ],
    },
  });

  await prisma.benefitAgreement.upsert({
    where: {
      researchRequestId_version: { researchRequestId: ids.request, version: 1 },
    },
    update: {
      status: "ACCEPTED",
      acceptedById: ids.governance,
      acceptedAt: new Date(),
    },
    create: {
      id: ids.benefit,
      researchRequestId: ids.request,
      version: 1,
      communityId: ids.community,
      researcherId: ids.researcher,
      description:
        "The research team commits to sharing the research findings with the contributing community and providing a knowledge-sharing session.",
      status: "ACCEPTED",
      acceptedById: ids.governance,
      acceptedAt: new Date(),
    },
  });

  await prisma.governanceDecision.upsert({
    where: { researchRequestId: ids.request },
    update: {},
    create: {
      id: ids.decision,
      researchRequestId: ids.request,
      communityId: ids.community,
      decisionMakerId: ids.governance,
      outcome: "APPROVED",
      reason: "Only synthetic aggregate academic analysis is approved for this demonstration.",
      approvedOperations: ["ACADEMIC_AGGREGATE_RESEARCH"],
      policyVersion: 1,
    },
  });

  await prisma.researchRequest.update({
    where: { id: ids.request },
    data: { status: "APPROVED" },
  });

  console.log("Synthetic AwaData Commons demo data seeded.");
}

seed()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
