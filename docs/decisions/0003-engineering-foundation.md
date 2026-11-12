# ADR 0003: Engineering foundation

- Status: Historical foundation decision
- Date: 2026-11-03

## Decision

- Use the existing NestJS and TypeScript backend with PostgreSQL through
  Prisma.
- Keep the API as a modular monolith and add only the components required for
  the focused synthetic demonstration.
- Keep database, authentication, and other secrets in environment
  configuration.
- Treat health and API documentation as operational conveniences, not proof of
  database readiness or production security certification.

## Rationale

This keeps the backend understandable and allows the consent/governance
demonstration to be tested end to end without introducing distributed
infrastructure.

## Consequences

The existing authentication foundation remains in place. Community, consent,
research/governance, deterministic access, audit, and benefit-sharing work is
implemented only when verified and documented against the focused PoC plan.
