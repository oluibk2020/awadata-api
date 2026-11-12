# AwaData Commons API — Project Instructions

## Purpose

AwaData Commons is a small NestJS proof of concept demonstrating how
individual consent and collective community governance jointly control access
to synthetic mental-health research data. The PoC is not a clinical system,
production platform, legal-compliance claim, or approval for real participant
data.

The single demonstration scenario is:

1. One synthetic community governs one synthetic dataset.
2. A synthetic participant permits academic aggregate research.
3. The participant refuses identifiable access and commercial AI model
   training.
4. A researcher submits one request covering those operations.
5. A governance representative approves only academic aggregate research.
6. The deterministic access policy permits the approved aggregate operation and
   denies identifiable access and commercial AI training.
7. Authorization decisions, access attempts, and a benefit-sharing commitment
   are recorded.

Individual consent never substitutes for community governance. Governance
approval never overrides an individual's refusal.

## Scope

The backend is the priority. Use the existing NestJS, TypeScript, PostgreSQL,
Prisma, JWT, and role-based authorization stack. Keep the architecture as a
testable modular monolith.

The only required logical modules are:

1. Community and dataset: one demonstration community, one dataset, and a few
   pseudonymous synthetic participants.
2. Consent: purpose/operation permissions, versioning where needed, and
   withdrawal.
3. Research requests and governance: one request and a simplified governance
   representative decision with reason and explicitly approved operations.
4. Deterministic authorization and controlled access: deny by default, check
   current trusted state, and enforce policy at the actual data-access path.
5. Audit and benefit sharing: record approvals, denials, access attempts, and a
   simple benefit-sharing commitment.

Do not build multi-community administration, complex membership or
organisations, elections, quorum systems, committee management, payment
processing, SDKs, portals, mobile apps, dashboards, microservices, queues, or
new infrastructure without a demonstrated PoC need. AI must never decide
consent, governance, authorization, or access.

## Protected existing implementation

Treat the current application and database implementation as read-only unless
the user explicitly requests a code-change task. Documentation-only work must
not modify:

- `prisma/schema.prisma`, Prisma models/enums/relations, migrations, Prisma
  configuration, or generated Prisma files;
- authentication, registration, JWT strategies, guards, decorators, roles,
  permissions, 2FA, sessions, login, logout, related DTOs, or services;
- existing source code, controllers, modules, utilities, middleware,
  configuration, dependencies, package files, environment files, tests, or
  deployment settings.

If documentation and implementation disagree, document the discrepancy and
mark the behavior unverified or planned. Do not change protected code to make
the documentation fit. Do not install packages, generate clients, create
migrations, reset databases, or run modifying scripts for documentation work.

## Data, privacy, and security

- Use synthetic records and pseudonymous participant codes only.
- Never add real names, contact details, government identifiers, clinical
  histories, or real mental-health records.
- Never send identifiable or sensitive research data to an external AI service.
- Keep authentication identity separate from research participant identity.
- Never log passwords, tokens, secrets, request bodies, or unnecessary
  participant data.
- Re-check account status, consent, governance, grant scope, operation, and
  expiry at access time.
- Do not return participant-level records from an aggregate endpoint.
- Treat consent withdrawal as a prospective restriction; do not claim it erases
  prior lawful access or exported copies.
- Do not claim legal compliance, production readiness, tamper-proof auditing,
  community approval, or a validated governance protocol without evidence.

## Engineering conventions

- Keep controllers thin and put policy in services.
- Validate DTOs and reject unexpected properties.
- Use typed enums and trusted database state; never trust client-supplied roles,
  IDs, statuses, consent, approval, or grant state.
- Use UUIDs, UTC timestamps, explicit expiry, and transactions for coupled
  writes.
- Use stable error responses without stack traces or sensitive data.
- Do not create a generic raw-record researcher endpoint.
- Do not add a second authentication system.

## Testing and workflow

Work on one milestone at a time:

1. Read this file, the relevant section of `docs/BUILD_PLAN.md`, the schema,
   existing code, tests, and current Git status.
2. State scope, assumptions, files, and acceptance criteria before editing.
3. Implement only the requested milestone and preserve existing behavior.
4. Test allowed and denied paths, including missing/stale/conflicting evidence.
5. Run the smallest relevant tests, build, and any configured checks. Report
   exact commands and results; never claim an unrun check passed.
6. Update directly related documentation and record material decisions in
   `docs/decisions/`.
7. Report changed files, known gaps, and the next milestone without starting it.

The PoC is complete only when the end-to-end scenario is demonstrable with
synthetic data and the approval/denial and audit behavior is tested.
