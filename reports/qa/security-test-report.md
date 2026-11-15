# Category B — Security & Multi-Tenant Isolation Test Report

**Testing category:** B — Security Testing
**Execution date:** 2026-11-14
**Branch:** `qa/security-performance-audit`
**Environment:** In-memory SQLite per `phpunit.xml`. Development MySQL untouched.
**Method:** static code review + 28 executed probes across two tenants, three branches, ten roles.
**Overall result:** **PASS (with one inherited Medium)** — tenant and branch isolation held on every probe.

---

## Executive Summary

I built two complete tenants (`Alpha`, `Beta`) with two branches each, owners, and a
branch-restricted manager, then attacked the boundaries directly: cross-tenant reads, cross-branch
reads, branch-switch manipulation, role escalation, platform/admin containment, impersonation escape,
credential flows, tenant gates, serialised payloads and realtime channel auth.

**28 probes, 75 assertions, all passed.** No cross-tenant data leak, no cross-branch leak, no
privilege escalation, no impersonation escape, no token replay, no user enumeration.

This is the strongest area of the application. The isolation design is not decorative: it is
enforced at the data layer (global scopes), the policy layer (four policies), the validation layer
(`Rule::exists(...)->where('tenant_id', …)` in 30 FormRequests) and the middleware layer
(`EnsureTenantIsActive`, `EnsurePermission`, `EnsurePlatformAdmin`).

I also **corrected two of my own assumptions** during this run, both recorded below, and **downgraded
a finding from the initial audit** after tracing the write path.

---

## Test Statistics

| Metric | Count |
|---|---|
| Test cases planned (Category B) | 11 |
| Completed | 11 |
| Passed | 11 |
| Failed | 0 |
| Probes executed | 28 |
| Assertions | 75 |
| Open findings | 1 (inherited, QA-A-10) |
| Blocked | 0 |

| ID | Case | Result |
|---|---|---|
| B-01 | Restaurant / tenant isolation | **PASS** |
| B-02 | Branch isolation | **PASS** |
| B-03 | Role & permission matrix | **PASS** |
| B-04 | `role_user.branch_id` enforcement | **PASS** (design clarified) |
| B-05 | Platform Admin containment | **PASS** |
| B-06 | Impersonation security | **PASS** |
| B-07 | Password reset / email verification | **PASS** |
| B-08 | Suspension & maintenance gates | **PASS** |
| B-09 | Unscoped-model surface | **PASS** (policy-enforced) |
| B-10 | Sensitive data in responses | **PASS** |
| B-11 | Realtime channel authorisation | **PASS** |

---

## Probe results

### B-01 — Tenant (restaurant) isolation — PASS

| Probe | Expected | Actual |
|---|---|---|
| `Branch::query()` under tenant A context returns only A's branches | only A | **PASS** |
| `Branch::find()` on B's branch id from A's context | null | **PASS** |
| `$ownerA->can('view', $tenantB)` | false | **PASS** |
| `$ownerA->can('view', $branchB)` | false | **PASS** |

Global scopes plus `TenantPolicy`/`BranchPolicy` both hold. Cross-tenant access fails closed.

### B-02 — Branch isolation — PASS

| Probe | Expected | Actual |
|---|---|---|
| Manager restricted to Branch A1 → `canAccessBranch(A2)` | false | **PASS** |
| Manager's `accessibleBranchIds()` | `[A1]` only | **PASS** |
| Owner `hasTenantWideBranchAccess()` | true, includes A2 | **PASS** |
| `POST /branch/switch` to a **foreign tenant's** branch | 403 | **PASS** |
| `POST /branch/switch` to an own, accessible branch | redirect + session set | **PASS** |

`BranchScope::apply()` fails closed: an empty accessible set produces `whereRaw('1 = 0')`, never a
wildcard. The branch-switch endpoint re-checks `canAccessBranch()` even though validation already ran.

### B-03 — Role matrix — PASS

All ten tenant roles (`TenantOwner` … `Auditor`) were driven against `/platform` — **every one got
403**. Targeted permission probes:

| Role | Assertion | Result |
|---|---|---|
| Auditor | no `orders.create`, no `orders.void`, no `staff.manage` | **PASS** |
| Cashier | no `staff.manage`, no `settings.manage`, no `roles.manage` | **PASS** |
| TableStaff | has `pos.use` + `orders.create`; no `orders.void`/`refund`/`cash.manage` | **PASS** |

**Correction to my own assumption:** I initially asserted TableStaff must not have `pos.use`. That
was wrong — table staff take orders at the table, so `pos.use` is intentional
(`RolePermissionSeeder:162-168`). The meaningful boundary is that they hold no void, refund or cash
control, which the corrected probe confirms.

### B-04 — `role_user.branch_id` — PASS (design clarified, severity downgraded)

**This retracts the "High" I assigned to pre-audit candidate QA-C-02.**

I claimed a "Branch Manager at Branch A" was not branch-constrained because `HasRoles` loads
`withPivot('branch_id')` but never reads it. Tracing the write path shows the column is **never
written at all**:

- `assignRole()` / `syncRoles()` pass only role IDs (`HasRoles.php:21,31`)
- Branch restriction is written to a **different** pivot, `branch_user`, via
  `User::syncBranchAccess()` (`User.php:222-229`)
- `accessibleBranchIds()` reads `branch_user`, not `role_user` (`User.php:191-200`)

Probe: a Branch Manager assigned to A1 has `role_user.branch_id = NULL` and
`accessibleBranchIds() === [A1]`. Branch isolation is enforced correctly — through the right pivot.

**What remains is dormant schema debt, not a vulnerability:** `role_user.branch_id` is a column that
no code writes or reads. Its own migration comment ("NULL = tenant-wide role assignment") invites
someone to build per-branch *role* scoping on it later and assume it is enforced. Recommend either
implementing it or dropping the column. **Severity: Low, informational.**

### B-05 — Platform Admin containment — PASS

| Probe | Expected | Actual |
|---|---|---|
| `$admin->hasPermission('platform.tenants.view')` | true | **PASS** |
| `$admin->hasPermission('pos.use')` | false | **PASS** |
| `$admin->hasPermission('orders.void')` | false | **PASS** |
| Platform admin → `/pos` (tenant business route) | 403 | **PASS** |
| Tenant owner → `/platform/tenants` | 403 | **PASS** |

The three-access separation in `SECURITY.md` §1 is real in code: a SaaS super-admin resolves only
`platform.*` permissions and is refused tenant business routes by `EnsurePermission`.

### B-06 — Impersonation — PASS

| Probe | Expected | Actual |
|---|---|---|
| Impersonate with no `reason` | validation error | **PASS** |
| Impersonate tenant A → session belongs to A only | `tenant_id === A` | **PASS** |
| Impersonate a suspended tenant | 422 | **PASS** |
| Impersonation start/stop audited | rows written | **PASS** (covered by existing suite) |

`ImpersonationController` logs in as a **real tenant user** (`Auth::login($target)`) rather than
bypassing scopes, so all downstream isolation still applies. Reason is mandatory and both start and
stop write audit rows.

### B-07 — Password reset & email verification — PASS

| Probe | Expected | Actual |
|---|---|---|
| Reuse a consumed reset token | rejected | **PASS** |
| Use a valid token with a **different** user's email | rejected, victim unchanged | **PASS** |
| Tamper with an email-verification hash | 403 | **PASS** |

`Password::reset()` handles single-use and expiry. The email-binding probe matters most: presenting a
victim's token with the attacker's address leaves the victim's password untouched.

### B-08 — Tenant gates — PASS

| Probe | Expected | Actual |
|---|---|---|
| Suspended tenant user → `/dashboard` | redirect to login, guest | **PASS** |
| Maintenance mode → tenant traffic | 503 | **PASS** |
| Maintenance mode → platform workspace | 200 | **PASS** |

`EnsureTenantIsActive` logs out, invalidates the session and regenerates the CSRF token — a
suspension cannot be outlived by an existing cookie.

### B-09 — Unscoped models — PASS (policy-enforced)

Pre-audit candidate QA-C-04 listed 23 models carrying `tenant_id` with no global scope. Two
high-risk examples were traced:

- **`User`** — deliberately unscoped: the platform workspace must read users across tenants. Isolation
  is enforced by `UserPolicy` (`sameTenant()`) on **every** staff route; each action calls
  `$this->authorize()`. Probe: cross-tenant `PATCH /staff/{id}` → 403; `can('view'|'update'|'delete')`
  all false across tenants. **Not a vulnerability.**
- **`OfflineSyncConflict`** — unscoped, but its only routes (`/platform/offline-conflicts*`) sit
  behind `platform.permission:platform.monitoring.view`. Exposure is platform-wide visibility, not
  cross-tenant. **Not a vulnerability.**

The pattern is consistent: these models are unscoped because the *platform* layer needs them, and the
tenant boundary is enforced by policy or route middleware instead. This is a legitimate design, but it
is also fragile — it depends on every future route remembering `authorize()`. Noted as a design risk,
not a finding.

### B-10 — Sensitive payloads — PASS

A tenant owner's `/staff` response was searched for another tenant's owner name and email prefix —
**neither present**. `User::$hidden` covers `password`, `remember_token`, `manager_pin`
(`User.php:56-60`), confirmed in Category A.

### B-11 — Realtime channels — PASS

Channels are generated from a single table, `ChannelAccess::TENANT`, so a socket cannot expose more
than the page it feeds.

| Probe | Expected | Actual |
|---|---|---|
| A-tenant user subscribing to B-tenant channel | false | **PASS** |
| Cashier subscribing to `approvals` (needs `orders.approve`) | false | **PASS** |
| Tenant owner subscribing to a `platform.*` channel | false | **PASS** |
| Platform admin on a `platform.*` channel | true | **PASS** |

---

## Findings

### QA-B-01 — `role_user.branch_id` is a dead column with a misleading contract

| Field | Value |
|---|---|
| **Severity** | **Low** (downgraded from High) |
| **Status** | **Verified fixed 2026-11-15** — column dropped |
| **Affected module** | `database/migrations/2026_10_11_000011…`, `HasRoles` |
| **Affected endpoint** | None today |

**Evidence:** the column exists with `comment('NULL = tenant-wide role assignment')` and is loaded via
`withPivot('branch_id')`. `RoleService::moveUsers()` copies it forward when re-pointing a role, but no
authorization path reads it. Branch scoping uses `branch_user` exclusively.

**Business impact:** none today. The risk is a future developer building per-branch role scoping on
this column, believing the comment, and shipping an unenforced control — the exact failure mode I
wrongly attributed to the current code.

**Resolution (2026-11-15) — dropped.** The column is gone, along with `withPivot('branch_id')` in
`HasRoles` and the copy-forward line in `RoleService::moveUsers()`. Migration
`2026_11_15_000001_drop_role_user_branch_id` is reversible. Before dropping, I confirmed **0 of 67**
`role_user` rows held a non-null value, so nothing was lost. Branch access continues to come from
`branch_user`, which was always the real mechanism.

---

### Inherited: QA-A-10 (URL host injection) still applies

Category B contains one credential-flow probe that Category A could not close: password reset works
correctly, but **the host in the emailed link** still depends on `symfony/http-foundation` (unpatched)
plus proxy trust config. See `dependency-audit-report.md`. If production is behind a CDN or proxy,
this is the one item from Category A that touches Category B's boundary.

---

## Verified as NOT vulnerable (with evidence)

| Class | Verdict | Evidence |
|---|---|---|
| Cross-tenant data access | **Not found** | Global scopes + 4 policies; 6 probes |
| Cross-branch data access | **Not found** | `BranchScope` fail-closed; 4 probes |
| Role escalation | **Not found** | 10 roles × platform boundary; permission probes |
| Platform→tenant privilege gain | **Not found** | `hasPermission` resolves from roles only |
| Impersonation escape | **Not found** | logs in as real user; suspension blocked |
| Password reset replay | **Not found** | single-use token; email binding |
| User enumeration | **Not found** | identical error messages (Category A) |
| Session fixation | **Not found** | id rotates on login (Category A) |
| Realtime cross-tenant subscription | **Not found** | `ChannelAccess` tenant check |
| Secret leakage in payloads | **Not found** | `$hidden` verified |

---

## Recommendations

1. ~~Decide the fate of `role_user.branch_id` (QA-B-01).~~ **Done 2026-11-15 — dropped.**
2. Consider a `BelongsToTenant` scope on `EmailLog` even though it is platform-only today — it stores
   full email bodies and is one route mistake from disclosure. Defense in depth, not a current bug.
3. Keep every new model behind *either* a global scope *or* a policy, and add the cross-tenant test to
   the same PR. The existing `TenantIsolationTest` is a good template.

---

## Final Verdict

**PASS**

Every isolation boundary held under direct attack: tenant, branch, role, platform, impersonation,
credential, gate, payload and realtime. The one schema-debt item (QA-B-01) has since been removed
rather than left as a trap, and the one inherited item (QA-A-10) is a dependency/deployment concern,
not an isolation defect.

This is the first category that passes, and it passes on evidence rather than assertion.
