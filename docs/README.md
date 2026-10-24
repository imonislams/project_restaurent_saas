# Restaurant POS SaaS — Documentation

Multi-tenant Restaurant Point-of-Sale platform for single restaurants, multi-branch
businesses, cloud kitchens and growing restaurant groups. Desktop-first business
application built on Laravel + Inertia + React + TypeScript.

## Documentation set

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Product requirements: vision, personas, workspaces, feature requirements for all 20 modules, user journeys and acceptance criteria |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture: stack decisions, module boundaries, folder structure, service layer rules |
| [DATABASE.md](./DATABASE.md) | Schema inventory by domain, critical relationships and mandatory data-integrity rules |
| [UI-UX.md](./UI-UX.md) | Desktop application shell, screen-by-screen requirements and POS interaction principles |
| [SECURITY.md](./SECURITY.md) | Tenant isolation, roles/permissions matrix, impersonation rules, payment safety |
| [custom-roles.md](./custom-roles.md) | Tenant-defined custom roles: data model, permission catalog, server-side rules, screens |
| [ROADMAP.md](./ROADMAP.md) | 14-phase build plan with per-phase exit requirements and approval gates |
| [PHASES.md](./PHASES.md) | Per-phase status and audit reports (scope, changes, tests, risks) |
| [PRODUCTION.md](./PRODUCTION.md) | Production readiness runbook — deploy, processes, monitoring, backups, rollback, go-live checklist |
| [PWA-OFFLINE.md](./PWA-OFFLINE.md) | Progressive Web App and offline POS — caching policy, offline data model, outbox/sync, conflict rules, offline auth |
| [RELEASE.md](./RELEASE.md) | Versioning (SemVer), branch model, commit convention, changelog, tagging and release/rollback process |

## Reading order

1. **PRD.md** — what we are building and why.
2. **ARCHITECTURE.md** — how it is structured.
3. **DATABASE.md** — the data model and integrity rules.
4. **UI-UX.md** — how it looks and behaves.
5. **SECURITY.md** — the boundaries that must never be crossed.
6. **ROADMAP.md** — the order in which we build it.
7. **PWA-OFFLINE.md** — how the app installs and keeps running without a network.
8. **RELEASE.md** — how a version is numbered, tagged and shipped.

## Three workspaces over one core platform

These are **three separate workspaces** on a shared core:

1. **POS workspace** — cashiers and restaurant staff.
2. **Management workspace** — owners and managers.
3. **SaaS owner control center** — the platform operator.

> A cashier must not see SaaS billing or platform maintenance, and a SaaS
> administrator must not automatically gain unrestricted access to tenant business
> data. Platform access, tenant business access and support access are **separate
> permissions**.

## Documentation conventions

- **Must / must not** — hard requirement, part of definition of done.
- **Should** — strong recommendation, deviation needs a documented reason.
- **May / optional** — configuration or staged capability.
- Every functional requirement is written so it can be traced to a route,
  policy, service and test.
