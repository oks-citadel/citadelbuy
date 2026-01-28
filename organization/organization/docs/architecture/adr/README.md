# Architecture Decision Records (ADRs)

## Overview

This directory contains Architecture Decision Records (ADRs) for the Broxiva Global B2B Enterprise Marketplace platform. ADRs document significant architectural decisions made during the platform's development and evolution.

## ADR Format

Each ADR follows this structure:
- **Title**: Short, descriptive name
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: The issue or problem being addressed
- **Decision**: The architectural decision made
- **Consequences**: The resulting context after applying the decision
- **Alternatives Considered**: Other options evaluated

## ADR Index

| ADR # | Title | Status | Date |
|-------|-------|--------|------|
| [001](./001-multi-region-deployment.md) | Multi-Region Deployment Strategy | Accepted | 2025-12-06 |
| [002](./002-microservices-architecture.md) | Microservices Architecture with AI Agents | Accepted | 2025-12-06 |
| [003](./003-database-selection.md) | PostgreSQL as Primary Database | Accepted | 2025-12-06 |
| [004](./004-multi-currency-support.md) | Multi-Currency and Exchange Rate Management | Accepted | 2025-12-06 |
| [005](./005-event-driven-architecture.md) | Event-Driven Architecture with Redis | Accepted | 2025-12-06 |
| [006](./006-data-residency.md) | Regional Data Residency Strategy | Accepted | 2025-12-06 |
| [007](./007-api-gateway-pattern.md) | API Gateway Pattern with Kong and NestJS | Accepted | 2025-12-06 |

## Creating New ADRs

When documenting a new architectural decision:

1. Create a new file: `XXX-short-title.md` (where XXX is the next number)
2. Use the template provided in `000-template.md`
3. Update this README with the new ADR entry
4. Submit for review before finalizing

## References

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
