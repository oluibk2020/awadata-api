# ADR 0001: Use a modular monolith for the API

- Status: Accepted as initial PoC direction
- Date: 2026-11-03

## Context

The PoC needs clear domain boundaries but is being built by a small team and must be demonstrable quickly.

## Decision

Use one independently deployable NestJS API repository, structured into domain modules. Keep the web frontend and TypeScript SDK in separate repositories.

## Consequences

- Simpler local development, deployment and integration testing.
- Domain boundaries remain explicit.
- Modules can be extracted later only if scale or operational needs justify it.
- No microservices, queues or event bus are required at the start.
