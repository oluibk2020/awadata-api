# AwaData Commons API — Focused PoC Plan

This plan describes one demonstrable scenario, not a production roadmap.
Implement one milestone at a time and keep each change small, deterministic,
and testable.

## Milestone 1 — Existing foundation and authentication

Preserve and verify the existing NestJS foundation, Prisma integration,
authentication, current-user endpoint, role guard, session revocation, and
2FA behavior. Document discrepancies; do not create a second auth system.

## Milestone 2 — Minimal community and dataset

**Status: REVIEW**

Represent one synthetic demonstration community, one dataset, and a few
pseudonymous participants with only the relationships required by the scenario.
Implemented routes are documented in `docs/API_CONTRACT.md`. Do not build
general community administration.

## Milestone 3 — Consent management

**Status: REVIEW**

Implemented participant-owned consent profile creation, explicit typed
operation decisions, versioning, current/history retrieval, and withdrawal.
Withdrawal preserves history and denies future access that relies on the
withdrawn consent. Research-request and access evaluation remain out of scope
until later milestones.

## Milestone 4 — Research request and governance decision

**Status: REVIEW**

Implemented authenticated researcher requests, ownership-scoped retrieval,
pending governance review, one final governance decision, explicit approved
operation subsets, reason validation, and transactional status/decision
updates. Elections, quorum, committees, and configurable voting protocols are
out of scope.

## Milestone 5 — Deterministic authorization and controlled access

**Status: REVIEW**

Implemented a deny-by-default policy service that checks the trusted
researcher, dataset, request, current participant consent, governance decision,
exact operation, and community consistency. Execution re-evaluates policy and
returns only synthetic aggregate metadata; no permanent grants or raw records
are introduced.

## Milestone 6 — Audit and benefit-sharing commitment

**Status: REVIEW**

Implemented backend-generated audit events for research, governance, consent,
authorization, execution, and benefit workflows, plus one non-financial
benefit-sharing commitment per approved research request. Payments, wallets,
automated distributions, and delivery management remain out of scope.

## Milestone 7 — Integration demonstration

**Status: REVIEW**

Added [DEMO_GUIDE.md](DEMO_GUIDE.md) with the actual synthetic setup and API
sequence. Automated repository tests cover the five implemented modules and
the principal allow/deny rules. A live demonstration still requires local
synthetic accounts and database data; no credentials or seed secrets are
stored in the repository.

## Explicitly out of scope

Multi-community administration, complex memberships or organisations,
research-institution onboarding, elections/quorum/committee management,
financial distribution, SDKs, portals, mobile apps, analytics dashboards,
microservices, queues, unnecessary infrastructure, real mental-health data,
external AI processing, and AI-based decisions.

## Status

Milestones are planning boundaries. A milestone is not accepted merely because
code exists; it requires tests, documentation, review, and user acceptance.
