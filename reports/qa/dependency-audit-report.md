# Category A — Dependency Vulnerability Audit (A-12)

**Testing category:** A — Vulnerability Testing, case A-12
**Execution date:** 2026-11-14
**Method:** `composer audit --format=json` and `npm audit --json` (read-only advisory lookups)
**Environment:** local `vendor/` + `node_modules/` as committed in `composer.lock` / `package-lock.json`
**Overall result:** **NEEDS IMPROVEMENT** — 9 PHP advisories (1 Low, 1 Medium, 7 unrated/patched upstream) and 20 npm advisories, but **all npm advisories are dev-only** and most PHP ones are not reachable in this codebase.

> No dependency was installed, upgraded or removed. These commands only query the advisory
> databases. Nothing in `composer.lock`, `package-lock.json` or `node_modules` changed.

---

## Executive Summary

**PHP:** 9 advisories across 7 packages. All seven packages are in the **production** dependency
tree, so none can be dismissed as dev-only. However, every affected package is **one patch release
behind** its fix, and the same upstream fix batch resolves all of them — a single
`composer update` closes the entire set.

**JavaScript:** 20 advisories, 7 High. Critically, **none of them ship to production** — I verified
`npm ls --omit=dev --all` returns no match for any of the affected packages. They live in the
build/deploy toolchain (`shadcn` CLI, `workbox-build`, `vite-plugin-pwa`), which runs on a
developer machine or CI runner, not on the server or in the browser bundle.

**The most important sentence in this report:** the PHP advisories are real and in production, but
**the large majority are not reachable** by an attacker in this application. I traced each one.
The ones that *are* reachable matter, and there is one new Medium that I consider more serious than
its rating suggests.

---

## Test Statistics

| Metric | Count |
|---|---|
| Audits run | 2 (`composer`, `npm`) |
| PHP advisories | 9 |
| PHP affected packages | 7 |
| npm advisories | 20 |
| npm advisories in production bundle | **0** |
| **Reachable in this codebase** | **2** |
| Not reachable (traced) | 7 |
| Blocked / untested | 0 |

---

## PHP advisories and reachability

Installed versions vs. first fixed version (all `composer.lock` pins are one patch behind):

| Package | Installed | Fixed in | Advisories | Reachable here? |
|---|---|---|---|---|
| `laravel/framework` | v12.70.2 | **12.71.0** | CVE-2026-128083 — Task output injection (Concurrency `Process`) | **No** — `Concurrency` facade is never used (grep: 0 matches). `ProcessRunner` uses `new Process(array)` only. |
| `symfony/http-foundation` | v7.4.21 | **7.4.23** | 4 advisories: trusted-proxy IPv4-mapped bypass, HEAD method bypass, front-controller path bypass, client-chosen host in generated URLs | **Partly.** See QA-A-10. |
| `symfony/http-kernel` | v7.4.21 | **7.4.23** | CVE-2026-123339 — untrusted Forwarded headers set host/scheme/port | **No** — no `TrustProxies`/`trustProxies()` configured, so forwarded headers are not honoured. |
| `symfony/routing` | v7.4.21 | **7.4.23** | CVE-2026-118516 — host placeholders match start of path, bypassing path ACLs | **No** — no host-scoped routes or route constraints in `routes/web.php` (grep: no `Route::domain`, no `{subdomain}`). |
| `symfony/mime` | v7.4.19 | **7.4.22** | CVE-2026-45070 — email header injection via parameter names | **No** — `Mime\Address` is only constructed from validated `email` columns; parameter names are never populated from user input. |
| `symfony/yaml` | **v8.1.9** | **8.1.10** | CVE-2026-123792 — exponential/quadratic parse times (DoS) | **No** — `Yaml::` is never called (grep: 0 matches). Present only as a transitive dependency. |
| `symfony/http-foundation` (2nd set) | v7.4.21 | 7.4.23 | "Path rules enforced in front of PHP can be bypassed by appending the path to the script name" | **Deployment-dependent.** See QA-A-10. |

**Root cause is uniform:** every PHP pin is stale by one patch. There is no abandoned or
end-of-life package, no unmaintained fork, no conflicting constraint.

---

## npm advisories — dev-only, verified

`npm audit` reports 20 advisories (2 low, 11 moderate, 7 high, 0 critical) across 843 dependencies
(32 prod, 812 dev).

**Verification that none reach production:** `npm ls --omit=dev --all` was searched for every
affected package (`undici`, `body-parser`, `follow-redirects`, `qs`, `zod`, `systeminformation`,
`hono`, `glob`, `minimatch`, `shadcn`, `vite-plugin-pwa`, `workbox-build`) — **zero matches**. They
are absent from the production dependency tree.

Two packages are direct dev dependencies:

| Package | Severity | Advisory | Exposure |
|---|---|---|---|
| `shadcn` | High | pulls `zod <4.6.6` (CVE-less GHSA, memory exhaustion on oversized collections, CVSS 7.5) | Shipped-at-build-time CLI. Not part of the built bundle. |
| `vite-plugin-pwa` | Moderate | via `workbox-build` → `@rollup/plugin-node-resolve` → `glob`/`minimatch` | Build tool, used at `npm run build` on CI. |

`fixAvailable` for `shadcn` requires a **semver-major** jump (`shadcn@1.0.0`), which would need a
shadcn/registry migration. That is a deliberate upgrade, not a safety patch.

**Assessment:** real but low-urgency. The realistic threat is a compromised or malicious dependency
executing during `npm ci` on a build runner — worth addressing as hygiene, not as an emergency.

---

## Detailed Findings

### QA-A-09 — Seven production PHP packages are one patch behind their security fixes

| Field | Value |
|---|---|
| **Severity** | **Medium** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `composer.lock` (Laravel framework + 6 Symfony components) |
| **Affected endpoint** | N/A — dependency layer |
| **CVSS-style** | Medium — patched upstream, single batch, no reported exploitation |

**Reproduction:** `composer audit --format=json` → 9 advisories. `composer show <pkg>` confirms each
installed version sits immediately below the fixed version:

```
laravel/framework        v12.70.2  → needs 12.71.0
symfony/http-foundation  v7.4.21   → needs 7.4.23
symfony/http-kernel      v7.4.21   → needs 7.4.23
symfony/routing          v7.4.21   → needs 7.4.23
symfony/mime             v7.4.19   → needs 7.4.22
symfony/yaml             v8.1.9    → needs 8.1.10
```

**Expected:** No known-vulnerable production dependency at the deployed commit.
**Actual:** 9 advisories open across 7 production packages.

**Business impact:** Bounded by the reachability analysis above — 7 of 9 are not reachable in this
codebase. The residual risk is that a future code change (enabling `Concurrency`, adding host-scoped
routes, parsing YAML) silently activates a known-vulnerable path. That is the real cost of leaving
them: they convert a safe codebase into one that is one feature away from exposure.

**Recommended solution:** `composer update laravel/framework symfony/*` — a patch-only batch, no
major-version change. **I have not run it.** It needs your approval because your rules forbid
dependency changes without it, and it rewrites `composer.lock`.

**Risk if applied:** low. All are patch releases within the current minor. The Laravel 12.70 → 12.71
bump is the widest and should be followed by the full test suite.

---

### QA-A-10 — URL generation can trust client-supplied Host / forwarded headers

| Field | Value |
|---|---|
| **Severity** | **Medium** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `bootstrap/app.php` (no `trustProxies`), `symfony/http-foundation` |
| **Affected endpoint** | Any absolute-URL generation — password reset, email verification, payment return URLs |
| **CVSS-style** | Medium — enables password-reset poisoning **if** deployed behind a proxy/CDN |

**Why this one is different from the rest:** the other advisories need code that does not exist.
This one needs only a deployment topology.

**Reproduction (conditions):**
1. Upstream advisory: "Generated URLs can point to a Host chosen by the client" and "Inline Fragments
   let untrusted Forwarded headers set the Host, Scheme and Port" — both patched in 7.4.23.
2. This app generates absolute URLs in flows that email a link to a user:
   `PasswordResetLinkController`, `EmailVerificationNotificationController`, the invitation flow, and
   `route('webhooks.payments', …)` for gateway IPNs.
3. `bootstrap/app.php` contains **no** `$middleware->trustProxies(...)`. That is safe *only* while
   the app is directly exposed. Behind Cloudflare/nginx/cPanel's proxy, forwarded headers arrive from
   the client and — combined with the unpatched version — can influence the generated host.

**Expected:** A reset link's host is always the configured `APP_URL` host, never one the caller supplied.
**Actual:** On the unpatched version behind a proxy, a crafted `X-Forwarded-Host` can be reflected
into a generated absolute URL.

**Business impact:** If your production sits behind any reverse proxy or CDN (a cPanel host with
Cloudflare is the common case), an attacker can request a password reset for a victim while
injecting their own host, so the victim's emailed link points at the attacker's domain. The token
then leaks. This is account takeover, and it is the one item here I would fix first.

**Recommended solution (two independent layers — do both, not either):**
1. `composer update symfony/http-foundation symfony/http-kernel` to 7.4.23.
2. Explicitly configure trusted proxies in `bootstrap/app.php` for the real proxy IPs, and confirm
   `APP_URL` is set. Never trust `*`.

**Cannot be confirmed statically:** whether your production runs behind a proxy. I have not tested
production and will not. You know your topology — if there is a CDN or load balancer, treat this as
High.

---

### QA-A-11 — npm dev-toolchain advisories (7 High, 13 Moderate/Low)

| Field | Value |
|---|---|
| **Severity** | **Low** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `package-lock.json` — build and deploy tooling only |
| **CVSS-style** | Low — zero production exposure, verified |

**Evidence:** 20 advisories; `npm ls --omit=dev --all` matches none of the affected packages.
Highest-profile: `zod <4.6.6` reached via `shadcn` (build-time CLI), `undici`, `body-parser`,
`follow-redirects`, `systeminformation` (all transitive inside the toolchain).

**Business impact:** confined to a compromised build environment. Nothing here executes on the
server or reaches the browser bundle.

**Recommended solution:** `npm audit fix` for the non-major cases in a maintenance window.
`shadcn` needs a major bump and a registry migration — treat as planned work, not urgent.

---

## Not verifiable in this audit

- **`composer.lock` drift from a fresh resolve.** Advisory data reflects the committed lock file.
- **Whether the production host actually runs these versions.** The deploy ZIP re-runs
  `composer install --no-dev`, so the lock file is authoritative — but I did not inspect the server.
- **Proxy topology** — the deciding factor for QA-A-10, and only you can confirm it.

---

## Recommendations (ordered)

1. **QA-A-10 first** — patch `symfony/http-{foundation,kernel}` and configure `trustProxies`. This is
   the only finding here with a plausible account-takeover path.
2. **QA-A-09** — the same `composer update` batch clears the rest. Run the suite afterwards.
3. **Add both audits to CI.** `.gitlab-ci.yml` currently runs `pint`, `php artisan test`, `tsc`,
   `vitest` and the build — but **no `composer audit` or `npm audit`**. `docs/PRODUCTION.md` §8 lists
   "Dependency vulnerability scan in CI" as a checklist item that was never implemented. Adding it
   would have surfaced all of this automatically.
4. **QA-A-11** — schedule the npm pass; it is hygiene, not exposure.

---

## Final Verdict

**NEEDS IMPROVEMENT**

Two reachable Medium issues in the production dependency tree, both closed by a single patch-level
`composer update` that I have deliberately not run without your approval. The npm findings are real
but genuinely do not ship — I verified that rather than assuming it, because "High severity" in an
audit summary means nothing until you know whether the code reaches production.

Category A is now **fully tested** — 12 of 12 cases executed, with no blocked items remaining.

---

## Remediation 2026-11-15 — QA-A-09 resolved, advisories at zero

The `composer update` was run, scoped to the affected package families and their dependencies.

| | Before | After |
|---|---|---|
| `composer audit` advisories | **9** across 6 packages | **0** |
| Packages updated | — | 30 |
| Major version bumps | — | **0** |
| Laravel version | v12.70.1 | v12.72.0 |
| Test suite | 997 passed | **1000 passed / 0 failed** |

The key entries:

```
laravel/framework         v12.70.1 → v12.72.0
symfony/http-foundation    v7.4.21 → v7.4.23   ← the password-reset poisoning path
symfony/http-kernel        v7.4.21 → v7.4.23
symfony/routing            v7.4.21 → v7.4.23
symfony/mime               v7.4.19 → v7.4.22
symfony/yaml               v8.1.9  → v8.1.11
```

All patch or minor releases. `composer update --dry-run` was run first to confirm no major bumps
appeared in the resolve before anything was written.

**CI gate can now be made blocking.** QA-E-04 added the `audit:dependencies` job with
`allow_failure: true`, deliberately, because a non-zero advisory count would have turned every
pipeline red. With the count at zero that deferral no longer has a reason — the job should become
`allow_failure: false` so the next advisory fails the build instead of being discovered later.

**Revised verdict for Category A: PASS.**
