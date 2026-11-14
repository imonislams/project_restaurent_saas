# Marketing & Growth Center — Documentation

Platform Admin workspace for acquiring, converting, retaining and reporting on restaurant
SaaS customers. Part of the **SaaS owner control center** (`/platform/marketing`).

**Related:** [Platform Admin](../PLATFORM_ADMIN.md) · [Security](../SECURITY.md) ·
[Architecture](../ARCHITECTURE.md) · [Database](../DATABASE.md) · [Design System](../DESIGN-SYSTEM.md)

---

## Document set

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Product requirements: objectives, scope, the 9 menu groups, per-module requirements with outcomes, journeys, acceptance criteria |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical design: domain layout, provider/registry pattern, event and attribution pipeline, jobs, scheduler, middleware, public routes |
| [DATA-MODEL.md](./DATA-MODEL.md) | Every new table with columns, indexes, constraints and relations; the reuse map for existing tables; migration order and rollback |
| [METRICS.md](./METRICS.md) | Every metric's exact formula, source tables, timezone rule, attribution model and reporting limitation |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Each external provider: capabilities, credential fields, endpoints called, status semantics, and what is *not* verified |
| [SECURITY.md](./SECURITY.md) | Permissions, credential encryption, tenant isolation, consent, data minimisation, audit actions |
| [ROADMAP.md](./ROADMAP.md) | The 9 phases with deliverables, per-phase verification and approval gates |

## Reading order

1. **PRD.md** — what we are building and why.
2. **ARCHITECTURE.md** — how it is put together.
3. **DATA-MODEL.md** — the tables and their integrity rules.
4. **METRICS.md** — what each number means and where it comes from.
5. **INTEGRATIONS.md** — what each external connection can and cannot do.
6. **SECURITY.md** — the boundaries that must never be crossed.
7. **ROADMAP.md** — the order in which it is built.

## Scope in one line

The Marketing & Growth Center is the SaaS owner's own marketing department: it tracks the
public website, captures and works restaurant leads, runs campaigns and email automation,
manages the SEO surface of the marketing site, and reports acquisition, subscription and
retention performance — **without** exposing any restaurant's own customers, staff or
business records.

## Conventions

Inherited from [docs/README.md](../README.md):

- **Must / must not** — hard requirement, part of definition of done.
- **Should** — strong recommendation; deviation needs a documented reason.
- **May / optional** — configuration or staged capability.
- Every requirement is traceable to a route, service and test.
- Every document states its **known limitations** rather than implying completeness.

## The one rule that governs everything here

> A metric is either backed by data this platform actually collected or fetched, or it is
> shown as **not available** with the reason. There are no placeholder numbers, no simulated
> integration success, and no ad spend presented as live unless an ad platform API supplied it.
