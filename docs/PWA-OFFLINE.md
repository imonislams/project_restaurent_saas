# PWA & Offline Operation

**Related docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md) · [RELEASE.md](./RELEASE.md) · [PRODUCTION.md](./PRODUCTION.md) · [ROADMAP.md](./ROADMAP.md)

This document defines how the platform runs as an installable Progressive Web App and how
the POS continues to operate when the network is unavailable. It is the authority for
caching, offline data, synchronisation, conflict handling and offline authentication.

> **Scope note.** "Offline operation" here means the **POS workspace** keeps taking orders
> and cash payments without the backend and replays them safely on reconnect. It does
> **not** mean offline card payment, offline kitchen display, or offline platform admin —
> see [Out of scope](#11-out-of-scope).

---

## 1. Hard constraints

- The service worker **must never** cache an Inertia page response, an XHR/`fetch` JSON
  response, or anything under `/api`. Only build assets, fonts, images and the offline
  shell page may be cached. Cached tenant data would cross tenant boundaries and serve
  stale business records.
- Every offline write **must** carry the existing idempotency key. Replaying a synced
  operation **must** be a no-op, never a second sale.
- The server **must** remain the authority for prices, totals, stock and order numbers.
  The client may display a provisional total; it may never invent one.
- A payment that cannot be authorised offline **must not** be recorded as settled.
- Offline-created records **must not** bypass tenant/branch scoping: the local store is
  namespaced per tenant, branch and user.

## 2. Caching policy

| Request | Offline behaviour |
|---|---|
| `public/build/*` (JS, CSS), fonts, icons, manifest | Precached by the service worker (stale-while-revalidate for revisions). |
| Same-origin images / brand assets | Runtime cache, cache-first with a bounded entry count. |
| Any Inertia page visit | Not cached. Offline → offline shell. |
| Any XHR / `fetch` / `/api` / `POST` | Never cached, never intercepted. |
| `/health`, `/up` | Never cached. |

The service worker is built in **`injectManifest`** mode so these rules are explicit in
`resources/js/pwa/sw.ts` rather than generated heuristically.

## 3. Offline data model

The POS needs a local mirror of everything required to compose an order:

| Entity | Source | Notes |
|---|---|---|
| Products, variants, modifier groups/options, categories | `GET /pos/offline-bundle` | Prices mirrored verbatim; never recalculated from scratch. |
| Payment methods | same | Flags which are cash (offline-eligible) vs gateway (online-only). |
| Tables, delivery zones, customers (recent) | same | Bounded lists. |
| Tenant pricing settings | same | `tax.rate`, `tax.inclusive`, `service_charge.rate`, `pos.allow_partial`, discount approval threshold. |
| Open shift | same | A sale requires an open shift; if none was open when the device went offline, sales are blocked. |
| Permission snapshot | same | Drives which offline actions are offered. |

- Storage: **IndexedDB** (`idb`), database name fixed, object stores keyed by
  `tenant:{tenantId}:branch:{branchId}`. The bundle carries a monotonic `version`; a
  newer version replaces the mirror atomically at the end of a successful sync cycle.
- The bundle **should** be refreshed on load when online, on reconnect, and on a low
  frequency interval. Refresh is cheap (one endpoint) and replaces the prior snapshot.

## 4. Outbox & sync engine

An **outbox** records every offline operation as an immutable entry:

```
{ uuid, type, payload, idempotency_key, captured_at, status: pending|syncing|accepted|rejected|conflicted, attempts, last_error }
```

- `idempotency_key` **must** be the existing `orders.idempotency_key` (client-generated
  UUID). This reuses the unique constraint and the `SaleService::findByKey()` short-circuit
  rather than inventing a second mechanism.
- Supported operation types: `place_sale`, `open_order`, `settle_order`. Void, refund and
  other approval-gated operations are **not** offline-capable (§8).
- Sync triggers (in order of reliability): `window` `online` event, window focus /
  visibility change, post-sale, and a periodic timer. **Background Sync is not relied on**
  — iOS Safari does not implement it.
- Flush is sequential and ordered by `captured_at` so dependent operations (open order →
  settle) apply in causal order. Each entry is retried with backoff; the outbox **must**
  survive reloads (IndexedDB, not memory).
- Transport: `POST /pos/sync` with a batch of operations; the server responds per item
  with `accepted | rejected | conflicted` and a reason. The server applies operations
  through the normal `SaleService`, so shift/stock/pricing/audit rules are unchanged.

## 5. Pricing parity (single specification)

Offline totals are computed client-side, so the pricing rules exist in two languages:

- `tests/Fixtures/pricing/*.json` is the **single specification** — input lines plus
  expected subtotal, discounts, tax, service charge, delivery fee and total, using the
  same half-up rounding at each step as `SaleCalculator`.
- `SaleCalculator` (PHP) is asserted against those fixtures by `SaleCalculatorParityTest`.
- The TypeScript implementation (`resources/js/offline/pricing.ts`) is asserted against
  the **same** fixtures by a frontend test.

Any divergence fails a test. The client mirrors prices from the server snapshot and
**must not** apply its own price rules.

## 6. Order numbers offline

Order numbers are gap-free per branch (`order_sequences`, `lockForUpdate`) and cannot be
allocated offline. Therefore:

- An offline order displays a **provisional** reference `OFF-<short-uuid>` and records it
  in `orders.offline_reference`.
- The real `order_number` is assigned by the server during sync.
- A receipt printed offline **must** be marked **"OFFLINE — provisional number, not yet
  synced"** so staff do not quote a number that will change.

## 7. Payments offline

| Method | Offline |
|---|---|
| Cash | Allowed. Cash movement is recorded against the shift on sync. |
| Gateway (SSLCommerz, bKash, Stripe, any `type != cash`) | **Blocked.** The method is disabled in the offline UI. |
| Partial / split with a gateway leg | Blocked offline. |

An order that cannot be fully paid offline is recorded as **unpaid / pending payment** —
never as settled. This matches [SECURITY.md](./SECURITY.md): a browser or local success
is not proof of payment.

## 8. Offline authentication & approvals

**There is no offline login, by design.** No credential material is cached in the browser and
a POS session cannot be started without reaching the server. Offline selling is available only
to a session that was already authenticated while online, and only for a bounded window.

- The device records the last time it **actually reached the server** (a successful catalogue
  fetch or sync flush). That timestamp is what the window is measured from.
- Once the window (`POS_OFFLINE_MAX_HOURS`, default **12 hours**) has passed, the POS refuses
  new offline sales and asks for a reconnect. A device that never reached the server counts as
  expired — the rule fails closed. Setting the window to `0` disables the limit.
- Rationale: an unattended or stolen terminal must not be able to keep trading indefinitely on
  a stale catalogue, stale prices and stale permissions.
- The offline session **may** take orders and cash payments only.

**Approval-gated actions are online-only.** A discount above the tenant's
`pos.discount_approval_percent` needs a manager PIN, verified by
`ManagerPinService::verify()` server-side. Because that verification cannot happen offline —
and must not be faked — the POS **refuses** such a sale offline and explains why, rather than
collecting a PIN it cannot check. Voids, refunds and other approvals follow the same rule.

## 9. Conflict rules

The server is authoritative. Each conflict is recorded and surfaced, never silently resolved.
Records live in `offline_sync_conflicts` and are reviewed from Platform Admin →
**Offline Sync Conflicts** (gated by `platform.monitoring.view`; resolving is audited).

| Conflict | Recorded type | Rule |
|---|---|---|
| Server total ≠ device total | `total_mismatch` | Accept at the **server** total and flag the difference (the device's figure is stored, so what the customer paid is visible). |
| Stock insufficient on sync | `stock_insufficient` | Honour `inventory.block_sale_when_insufficient`: reject and flag, or accept and flag the negative stock, per the tenant setting. |
| Table already occupied by another order | `table_occupied` | Drop the table binding, keep the sale, flag it. The sale is never lost over a table. |
| Shift closed while offline | `shift_closed` | Reject the sale against that shift; flag for cash reconciliation. |
| Product became unavailable | `product_unavailable` | Reject and flag. |
| Anything else | `rejected` | Reject and flag with the raw server message. |

A conflict is `open` until a platform admin marks it reviewed (with an optional note), which
records the reviewer and time.

## 10. Device & storage caveats

- iOS Safari may evict IndexedDB after long inactivity and offers no Background Sync — the
  app therefore flushes on foreground and must warn when the outbox is non-empty and the
  device has been offline a long time.
- Storage quotas are finite; the mirror holds bounded catalog/customer lists, not the full
  order history (which is server-side and paginated, per existing conventions).

## 11. Out of scope

- Offline card / online payments.
- Offline kitchen display (KDS) and cross-device offline coordination.
- Multi-device auto-merge of the same table or shift.
- Offline Platform Admin workspace.
- Solving iOS storage eviction (documented, mitigated by foreground sync — not solved).

---

## Status

Phased delivery with approval gates (see [ROADMAP.md](./ROADMAP.md) Phase 17). Per-phase
reports are recorded in [PHASES.md](./PHASES.md).

| Capability | State |
|---|---|
| Installable app (manifest, icons, offline shell) | Delivered — 17B |
| Versioning, release process | Delivered — 17C/17D |
| Catalogue mirror (`GET /pos/offline-bundle`, IndexedDB) | Delivered — 17E |
| Outbox + sync engine (replay-safe, `place_sale` / `open_order` / `settle_order`) | Delivered — 17E |
| Offline POS capture (cash only, provisional reference) | Delivered — 17F |
| Pricing parity harness (PHP ↔ TypeScript, shared fixtures) | Delivered — 17F |
| Conflict recording + reconciliation UI | Delivered — 17G |
| Offline auth / approval hardening | Delivered — 17H |
| Offline card payments, offline KDS, multi-device merge | Out of scope (see §11) |

There is **no offline login**: offline selling requires a session authenticated while online
and a server contact within the window (§8). Differences the server resolves on sync are
recorded in `offline_sync_conflicts` and reviewed from Platform Admin → Offline Sync Conflicts.
