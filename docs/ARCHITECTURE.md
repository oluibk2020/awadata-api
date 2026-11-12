# Architecture

## Decision

Use the existing NestJS modular monolith with PostgreSQL and Prisma. Keep one
backend deployment and introduce only the modules needed for the single
synthetic demonstration scenario. Do not add microservices, queues, event
buses, SDKs, or separate deployable services.

## Logical modules

1. **Community and dataset** — minimal community, dataset, and participant
   records.
2. **Consent** — versioned purpose/operation permissions and withdrawal.
3. **Research and governance** — request submission and simplified governance
   representative decision.
4. **Authorization and data access** — deterministic policy evaluation and
   enforcement at execution.
5. **Audit and benefits** — decision/access records and a benefit-sharing
   commitment.

Existing authentication remains the identity boundary. The JWT identifies the
caller, but authorization resolves current account and resource state from the
database.

## Decision path

```text
Authenticated researcher
        |
        v
Resolve trusted request, dataset, community and participant state
        |
        v
Check current consent for purpose + operation
        |
        v
Check explicit governance approval for the same purpose + operation
        |
        v
Check exact grant and time window, when grants are used
        |
        +---- deny --> record denial audit event
        |
        +---- allow -> enforce again at data execution
                              |
                              v
                     record access audit event
                              |
                              v
                    return minimised synthetic aggregate
```

No prior approval response is a permanent capability. The data-access path
must re-evaluate relevant current state and must never return identifiable
records for the aggregate demonstration. Backend services also append
structured audit events for decisions and execution attempts, while benefit
agreements remain non-financial commitments tied to approved research.
