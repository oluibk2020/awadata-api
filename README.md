# AwaData Commons API

AwaData Commons is a focused backend proof of concept for community-governed
use of synthetic mental-health research data.

## What the PoC demonstrates

One synthetic community governs one synthetic dataset. A participant permits
academic aggregate research but refuses identifiable access and commercial AI
model training. A researcher submits one request, a governance representative
approves only the aggregate operation, and the backend:

- permits the approved aggregate operation;
- denies identifiable access and commercial AI training;
- requires both current participant consent and community approval;
- records authorization decisions and access attempts; and
- records a benefit-sharing commitment.

This is not a production platform, clinical system, legal-compliance claim, or
approval to process real mental-health data. All fixtures and demonstrations
must be synthetic.

## Technology

- NestJS and TypeScript
- PostgreSQL through Prisma
- JWT authentication
- Role-based authorization
- Modular monolith architecture

## Current status

Authentication foundations currently include login, current-user lookup,
JWT/session validation, role metadata/guard support, individual logout, and
2FA hardening. The community, consent, research/governance, deterministic access, audit, and
benefit-sharing workflow is implemented for the focused synthetic scenario.
The final integration sequence is documented in
[docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the focused milestones and
[docs/API_CONTRACT.md](docs/API_CONTRACT.md) for implemented versus planned
routes.

## Local development

Create a local environment file from `.env.example` if present and provide the
repository's required database and JWT settings. Do not commit secrets.

```bash
npm install
npm run prisma:generate
npm run build
npm test -- --runInBand
npm run start:dev
```

The API uses the configured PostgreSQL connection. Use only synthetic
development data. Do not reset or migrate a shared database without explicit
approval.

## Boundaries

Do not add mobile applications, SDKs, developer portals, payment systems,
complex governance administration, microservices, message queues, dashboards,
real-data integrations, or AI decision-making to this PoC.
