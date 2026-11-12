# Focused PoC Implementation Guide

Use one milestone from [BUILD_PLAN.md](BUILD_PLAN.md) at a time. Read
[AGENTS.md](../AGENTS.md), inspect the current code and schema, and preserve
the existing authentication implementation.

## Standard milestone prompt

```text
Implement only the requested AwaData Commons PoC milestone.

Read AGENTS.md and the relevant section of docs/BUILD_PLAN.md. Inspect the
current code, Prisma schema, tests, and Git status before editing. Keep the
implementation within the single synthetic scenario: one community, one
dataset, a few pseudonymous participants, one researcher, one governance
representative, and one research request.

Do not add multi-community administration, complex memberships, elections,
quorum/committee workflows, payments, SDKs, portals, mobile apps,
microservices, queues, dashboards, real-data integrations, or AI decision
making.

Use deterministic server-side checks. Consent and governance are separate
safeguards. Deny by default and enforce authorization at actual data access.
Add allowed and denied tests, update directly related documentation, and run
the smallest relevant checks plus build. Report exact results and known gaps.
Do not claim user acceptance.
```

## Documentation-only prompt

```text
Update project instructions and documentation only.

Treat application source, authentication, Prisma schema, migrations, generated
Prisma files, tests, dependencies, environment configuration, and deployment
settings as read-only. Document discrepancies instead of changing protected
code. Do not install packages, generate clients, create migrations, reset
databases, or run modifying scripts. Inspect Git diff and confirm that only
intended documentation files changed.
```
