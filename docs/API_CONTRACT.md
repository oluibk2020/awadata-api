# API Contract

Only routes verified in the current code are marked **Implemented**. Planned
routes support the focused PoC scenario and must not be described as available
until implemented and tested.

## Conventions

- JSON REST API with UTC timestamps and UUID identifiers where applicable.
- Protected routes require JWT authentication and current account validation.
- Role and resource authorization are separate from authentication.
- Errors must not expose stack traces, secrets, password hashes, or sensitive
  participant data.
- Aggregate routes must not return participant-level records.

## Implemented authentication routes

| Method | Route | Status | Purpose |
|---|---|---|---|
| `POST` | `/auth` | Implemented | Password login; may return a 2FA challenge. |
| `GET` | `/auth/me` | Implemented | Return the authenticated user's safe profile. |
| `POST` | `/auth/logout` | Implemented | Revoke the presented token session. |
| `POST` | `/auth/2fa/setup` | Implemented | Start authenticated 2FA setup. |
| `POST` | `/auth/2fa/verify` | Implemented | Complete authenticated 2FA setup. |
| `POST` | `/auth/2fa/disable` | Implemented | Disable authenticated 2FA. |
| `GET` | `/auth/2fa/status` | Implemented | Return authenticated user's 2FA status. |
| `POST` | `/auth/2fa/verify-token` | Implemented | Complete a login 2FA challenge. |

These routes reflect the current implementation and are not evidence of
production readiness.

## Implemented Milestone 1 routes

All Milestone 1 routes require JWT authentication. Create routes additionally
require `PLATFORM_ADMIN` or `COMMUNITY_ADMIN`. Responses contain only
pseudonymous participant references and synthetic dataset metadata.

| Method | Route | Status | Purpose |
|---|---|---|---|
| `POST` | `/communities` | Implemented | Create a minimal community. |
| `GET` | `/communities` | Implemented | List communities. |
| `GET` | `/communities/:id` | Implemented | Retrieve one community. |
| `POST` | `/communities/:communityId/datasets` | Implemented | Create synthetic demonstration dataset metadata. |
| `GET` | `/communities/:communityId/datasets` | Implemented | List datasets belonging to a community. |
| `GET` | `/communities/:communityId/datasets/:id` | Implemented | Retrieve a dataset within its community. |
| `POST` | `/communities/:communityId/datasets/:datasetId/participants` | Implemented | Create a pseudonymous synthetic participant record. |
| `GET` | `/communities/:communityId/datasets/:datasetId/participants` | Implemented | List participants within the dataset/community boundary. |
| `POST` | `/communities/:communityId/datasets/:datasetId/participants/profile` | Implemented | Create the authenticated participant's pseudonymous profile; user identity comes from the JWT. |

## Implemented Milestone 2 routes

These routes require JWT authentication and the `PARTICIPANT` role. The
participant is resolved from the authenticated account's linked profile; no
participant or user identifier is accepted from the request body.

| Method | Route | Status | Purpose |
|---|---|---|---|
| `POST` | `/participants/me/consent` | Implemented | Create the next version of consent for the linked participant. |
| `GET` | `/participants/me/consent/current` | Implemented | Retrieve the current active consent. |
| `GET` | `/participants/me/consent/history` | Implemented | Retrieve consent versions, including superseded and withdrawn history. |
| `POST` | `/participants/me/consent/withdraw` | Implemented | Withdraw the latest active consent without deleting history. |

Consent decisions are explicit for academic aggregate research, identifiable
record access, and commercial AI training. Creating a new version supersedes
the prior active version; withdrawal denies future use of that consent.

## Implemented Milestone 3 routes

Researcher routes require JWT authentication and the `RESEARCHER` role. The
researcher ID is derived from the authenticated account. Governance routes
require JWT authentication and the `GOVERNANCE_MEMBER` role.

| Method | Route | Status | Purpose |
|---|---|---|---|
| `POST` | `/research/requests` | Implemented | Submit a dataset research request with typed operations. |
| `GET` | `/research/requests` | Implemented | List the authenticated researcher's requests. |
| `GET` | `/research/requests/:id` | Implemented | Retrieve one of the authenticated researcher's requests. |
| `GET` | `/governance/requests/pending` | Implemented | List pending requests for governance review. |
| `GET` | `/governance/requests/:requestId/decision` | Implemented | Retrieve a request decision for its researcher or a governance member. |
| `POST` | `/governance/requests/:requestId/approve` | Implemented | Approve a pending request with an explicit non-empty operation list. |
| `POST` | `/governance/requests/:requestId/reject` | Implemented | Reject a pending request with a reason. |

Only the three PoC consent operation values are accepted. An approved
operation must have been requested, and each request can have only one final
governance decision.

## Planned PoC routes

The following are planned only as needed for the demonstration:

- `GET /health`
- minimal community and dataset/participant setup routes or synthetic seed
  procedure;
- deterministic access authorization;
- controlled synthetic aggregate data execution;
- audit event retrieval for authorized observers;
- benefit-sharing commitment recording.

## Implemented Milestone 4 routes

These routes require JWT authentication and the `RESEARCHER` role. Both
operations re-evaluate the trusted request, dataset, governance decision, and
current consent; authorization responses do not create permanent grants.

| Method | Route | Status | Purpose |
|---|---|---|---|
| `POST` | `/access/authorize` | Implemented | Evaluate one requested operation without releasing data. |
| `POST` | `/access/execute` | Implemented | Re-evaluate authorization and return only synthetic aggregate metadata. |

`IDENTIFIABLE_RECORD_ACCESS` and `COMMERCIAL_AI_TRAINING` are never executable.
Aggregate execution returns synthetic aggregate metrics computed from currently
eligible consenting participants. It never returns participant identifiers,
subject codes, names, or individual records.

## Implemented Milestone 5 routes

Audit retrieval requires JWT authentication and either `PLATFORM_ADMIN` or
`AUDITOR`. Audit events are generated by backend services and cannot be
created, edited, or deleted through the API.

| Method | Route | Status | Purpose |
|---|---|---|---|
| `GET` | `/audit/events` | Implemented | Retrieve filtered accountability events with bounded pagination. |
| `POST` | `/benefits/agreements` | Implemented | Create one benefit commitment for an approved owned research request. |
| `GET` | `/benefits/requests/:requestId/agreement` | Implemented | Retrieve the researcher's benefit commitment. |
| `PATCH` | `/benefits/agreements/:id` | Implemented | Update a commitment status. |

Benefit agreements record non-financial commitments only. They do not verify
delivery or perform payments.

Update this contract when a planned route is actually implemented. Do not add
routes for excluded production features.
