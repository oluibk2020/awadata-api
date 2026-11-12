# Minimal Domain Model

This document describes the smallest model that can support the focused PoC.
The existing Prisma schema is authoritative. Do not add fields or entities
from this document without a separate approved implementation task.

## Entities

- **User:** existing authenticated account used by the researcher and
  governance representative. Authentication identity is separate from
  participant identity.
- **Community:** one synthetic community governing the demonstration dataset.
- **Dataset:** one synthetic dataset owned by the community.
- **Participant:** pseudonymous contributor linked to the dataset; never a
  direct-identity or clinical-history record. An optional one-to-one link to
  the authenticated participant account supports self-service consent without
  exposing account identity in research responses.
- **Consent:** versioned participant permission state tied to one dataset and
  purpose, with withdrawal and preserved history.
- **ConsentPermission:** one typed decision for each supported operation:
  academic aggregate research, identifiable record access, and commercial AI
  training.
- **ResearchRequest:** authenticated researcher, dataset, stated purpose,
  typed requested operations, and the `PENDING`/`APPROVED`/`REJECTED`
  lifecycle.
- **GovernanceDecision:** one final representative decision per request,
  outcome, reason, and explicitly approved subset of requested operations.
- **AccessGrant:** optional narrow grant bound to researcher, request, dataset,
  operations, and time window.
- **AuditEvent:** actor, action, resource, outcome, reason, and correlation
  information without secrets or unnecessary participant data. Event type,
  operation, request, and dataset references are typed where applicable.
- **BenefitAgreement:** one non-financial commitment associated with approved
  research, its responsible researcher, and beneficiary community. Status is
  recorded but delivery is not independently verified.

The model must not expand into complex memberships, organisations, committees,
payments, wallets, or benefit-delivery management for this demonstration.

## Required invariants

- Consent and governance are separate checks.
- Missing, withdrawn, expired, conflicting, or mismatched consent denies access.
- Governance approval must identify the exact purpose and operation.
- Governance approval cannot override a participant refusal.
- Access is scoped to the authenticated researcher, request, dataset, and
  operation.
- Governance cannot decide a request submitted by the same account, approve
  unrequested operations, or approve an empty unrestricted operation set.
- Participant research data remains pseudonymous and synthetic.
- Audit events are backend-generated and append-only through the public API.
- Benefit agreements require an approved request and the dataset's owning
  community.
