# AwaData Commons PoC Demo Guide

This guide describes the synthetic end-to-end scenario. It does not contain
credentials, tokens, database URLs, or real participant data.

## Prerequisites

- Node.js and npm installed.
- A PostgreSQL database configured through the local environment.
- Dependencies installed with `npm install`.
- Prisma client generated with `npx prisma generate`.
- Migrations applied with `npx prisma migrate deploy`.
- `DEMO_SEED_PASSWORD` set in the shell.

Use only a disposable or local synthetic database. Never reset a shared or
production database.

## Demo accounts and data

The Prisma seed creates these accounts with deterministic fictional email
addresses:

- one `RESEARCHER`;
- one `GOVERNANCE_MEMBER`;
- one `PLATFORM_ADMIN` or `AUDITOR`;
- three `PARTICIPANT` accounts linked to pseudonymous profiles.
- one `AUDITOR`.

The seed reads the password from `DEMO_SEED_PASSWORD`, hashes it with bcrypt,
and never stores the plaintext password. These credentials are for an isolated
demo environment only and must never be used in production.

On PowerShell, set the password for the current shell without committing it:

```powershell
$secure = Read-Host "Demo seed password" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:DEMO_SEED_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
```

The password must satisfy the existing authentication password policy.

The seed creates one community named `AwaData Demo Community` and one dataset
named `Synthetic Community Mental Health Research Dataset`, clearly marked as
synthetic demonstration data.

The seed creates participants with subject codes:

- `PARTICIPANT-A`
- `PARTICIPANT-B`
- `PARTICIPANT-C`

The seed creates current consent for each participant. To run the complete
scenario from an empty database:

```powershell
npm run prisma:migrate
npm run prisma:seed
```

Running `npm run prisma:seed` again is safe and does not delete or reset
records. The seed does not run automatically when the API starts.

To exercise the consent endpoint manually instead, use:

```http
POST /participants/me/consent
Authorization: Bearer <participant-token>
```
```

```json
{
  "purpose": "ACADEMIC",
  "decisions": {
    "ACADEMIC_AGGREGATE_RESEARCH": true,
    "IDENTIFIABLE_RECORD_ACCESS": false,
    "COMMERCIAL_AI_TRAINING": false
  }
}
```

## Request and governance sequence

Authenticate with `POST /auth` using locally configured account credentials.
Do not place credentials or returned tokens in this document.

Submit the request as the researcher:

```http
POST /research/requests
Authorization: Bearer <researcher-token>
Content-Type: application/json
```

```json
{
  "datasetId": "<dataset-id>",
  "title": "Synthetic aggregate community study",
  "description": "Evaluate synthetic aggregate patterns for demonstration.",
  "purpose": "ACADEMIC",
  "operations": [
    "ACADEMIC_AGGREGATE_RESEARCH",
    "IDENTIFIABLE_RECORD_ACCESS",
    "COMMERCIAL_AI_TRAINING"
  ]
}
```

First review and approve the research request as the governance member.
Research approval alone does not grant data access:

```http
POST /benefits/agreements
Authorization: ******
Content-Type: application/json
```

```json
{
  "researchRequestId": "<request-id>",
  "communityId": "<community-id>",
  "description": "The research team commits to sharing the research findings with the contributing community and providing a knowledge-sharing session."
}
```

After approval, the researcher creates the benefit agreement. It starts in
`PENDING`. The governance member then accepts or rejects it:

```http
POST /benefits/agreements/<agreement-id>/accept
Authorization: ******
```

To reject instead:

```http
POST /benefits/agreements/<agreement-id>/reject
Authorization: ******
Content-Type: application/json
```

```json
{
  "reason": "Please clarify the community reporting commitment."
}
```

Only a governance member of the dataset's community can review it. Rejection
preserves the historical version and allows the researcher to submit another
version. Access is allowed only after acceptance.

Now review and approve as the governance member:

```http
GET /governance/requests/pending
Authorization: Bearer <governance-token>
```

```http
POST /governance/requests/<request-id>/approve
Authorization: Bearer <governance-token>
Content-Type: application/json
```

```json
{
  "reason": "Only synthetic aggregate academic analysis is appropriate for this demonstration.",
  "approvedOperations": ["ACADEMIC_AGGREGATE_RESEARCH"]
}
```

## Authorization and execution

As the researcher, evaluate each operation:

```http
POST /access/authorize
Authorization: Bearer <researcher-token>
Content-Type: application/json
```

```json
{
  "researchRequestId": "<request-id>",
  "operation": "ACADEMIC_AGGREGATE_RESEARCH"
}
```

Expected results:

- academic aggregate research: `ALLOW`;
- identifiable record access: `DENY`;
- commercial AI training: `DENY`.

Execute the approved operation directly:

```http
POST /access/execute
Authorization: Bearer <researcher-token>
Content-Type: application/json
```

```json
{
  "researchRequestId": "<request-id>",
  "operation": "ACADEMIC_AGGREGATE_RESEARCH"
}
```

The result contains synthetic aggregate metrics for the eligible participants,
such as participant count and average wellbeing, sleep-quality, and stress
scores. It must not contain participant IDs, subject codes, names, account IDs,
or individual records. The seed creates one deterministic synthetic observation
for each of the three demo participants in the demo dataset.
Identifiable and AI-training execution attempts must be denied.

## Consent withdrawal check

As `PARTICIPANT-C`, withdraw consent:

```http
POST /participants/me/consent/withdraw
Authorization: Bearer <participant-c-token>
```

Repeat the academic authorization and execution calls. Both must now return
`DENY`; no aggregate result may be released.

## Benefit-sharing commitment

The agreement created and accepted before approval has status `COMMITTED`.
Retrieve it with:

```http
Authorization: Bearer <researcher-token>
Content-Type: application/json
```

```json
{
  "researchRequestId": "<request-id>",
  "communityId": "<community-id>",
  "description": "The research team commits to sharing the research findings with the contributing community and providing a knowledge-sharing session."
}
```

The agreement is already described above; use the retrieval request below:

```http
GET /benefits/requests/<request-id>/agreement
Authorization: Bearer <researcher-token>
```

The response includes `rejectionReason` when the latest version was rejected,
so the researcher can address the governance note in the next version.

This is a recorded non-financial commitment, not proof of delivery.

## Audit inspection

As a `PLATFORM_ADMIN` or `AUDITOR`:

```http
GET /audit/events?researchRequestId=<request-id>
Authorization: Bearer <audit-token>
```

The history should contain distinct events for request submission, governance
decision, authorization allow/deny, execution success/denial, consent
withdrawal, and benefit agreement creation. Researchers and participants must
not have unrestricted audit access.

## Verification commands

```powershell
npx prisma validate
npx prisma generate
npm run build
npm test -- --runInBand
```

The repository tests use synthetic fixtures. A live API demonstration requires
locally configured database connectivity and synthetic account setup.

## Neon deployment

Set `DATABASE_URL` to the intended Neon PostgreSQL connection string through
the deployment environment. Do not commit `.env` files or connection strings.
Run migrations separately during deployment:

```powershell
npm run prisma:migrate
```

Run the demo seed only against an isolated demonstration database:

```powershell
$env:DEMO_SEED_PASSWORD = "<set-locally>"
npm run prisma:seed
```

Production builds and API startup do not seed the database automatically.
