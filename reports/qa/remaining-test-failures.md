# Remaining Test Failures — Diagnosis and Resolution

**Date:** 2026-11-14 (updated 2026-11-15)
**Context:** after enabling `gd`, the suite went from **16 failures to 5**.
**Outcome:** all 5 resolved. The suite now stands at **1004 passed, 0 failed** (6,700 assertions) as of
2026-11-15, after the QA-A-09 dependency update, the QA-B-01 column drop and the QA portal access tests.

---

## Final result

| Run | Result |
|---|---|
| Original, no `gd` | **16 failed**, 978 passed |
| With `gd` only | 5 failed, 991 passed |
| **After these fixes + `gd`** | **0 failed, 996 passed** (6,681 assertions) |
| `pint --test` | **PASS** on 948 files |

---

## 1. `StockBalancePaginationTest` — test bug, fixed

**Was:** `->where('balanceStats.valuation', 10.0)` failed with "10 is identical to 10.0".
**Cause:** JSON has no int/float distinction — `json_encode(10.0)` yields `10`. The controller was
always correct (it returns a float; the type is lost in serialisation).
**Fix:** compare numerically — `fn ($value) => (float) $value === 10.0`.

---

## 2. `MarketingEmailDeliveryTest` — real documentation defect, fixed

**Was:** a test asserting that an unsubscribe *after queueing* blocks delivery.
**Measured:** both rows were already `sent` before the unsubscribe could take effect.

**Root cause:** `EmailMarketingService::queueCampaign()` calls `dispatchSync()` at line 130 — it
delivers inline, not via the queue. The method name, the test, and the class docblock all assumed
asynchronous delivery.

The docblock claimed:

> *"an unsubscribe that happens after a campaign was queued still stops that recipient's copy"*

**That was false.** There is no queue window at all.

**Fix (option 1 — documentation corrected, behaviour kept):**
- The docblock now states plainly that delivery is synchronous and an opt-out only applies to mail
  not yet handed to the transport.
- The test now models "queued but not yet delivered" by creating a `pending` send row directly, and
  asserts the guarantee that **does** hold: `send()` refuses a suppressed address, marks the row
  `failed` with the suppression reason, and nothing reaches the transport.

**Not changing the behaviour is deliberate.** The comment says synchronous delivery exists so mail
still goes out when no queue worker is running — a reasonable choice for a self-hosted product.
Switching to `dispatch()` would require a worker and would silently stop marketing email without one.

**Still worth deciding later:** a large campaign blocks the HTTP request for its whole duration
(~5,000 subscribers ≈ 4 minutes). If that becomes a problem, the fix is chunked dispatch, not a
docblock.

---

## 3. `MarketingPublicTrackingTest` — test-isolation defect, fixed

**Was:** asserted `- Touch Dine` in the rendered title; the page actually said `- Laravel`.
**Cause:** the brand comes from `general.platform_name`, falling back to `config('app.name')`. The
test never set either, so it inherited whatever the developer's `.env` contained — which is
`APP_NAME=Laravel`.
**Fix:** `config(['app.name' => 'Touch Dine'])` at the top of the test. It now tests the behaviour
(brand appended exactly once) rather than the machine's configuration.

---

## 4. `MarketingSeoTest` — real gap, fixed

**Was:** asserted `touchdine.cafe` appears in the sitemap fallback.
**Cause:** the static fallback file (`storage/app/seo/sitemap.static.xml`) **does not exist**, and
`SeoSiteFiles::staticFile()` returns `''` when no candidate is found.

**That was a real defect:** with sitemap generation switched off, `/sitemap.xml` returned a **200 with
an empty body** — which reads to a crawler as "valid sitemap, zero URLs", a worse outcome than not
answering at all. The class's own comment promises "the site must keep serving a valid file rather
than a 500 or an empty response."

**Fix:** `SeoSiteFiles::sitemap()` now falls back to the generated document when no static file
exists, and to a minimal valid `<urlset/>` if generation itself fails. The `X-Sitemap-Source` header
reports the truth (`static` or `generated`). The test asserts the guarantee that matters — never empty,
always valid XML.

---

## 5. `DocumentationTest` — stale test, fixed (surfaced by the run, not pre-existing in the count)

**Was:** asserted guests are redirected from `/docs` to `/login`.
**Actual:** `/docs` returns 200 to guests.
**Cause:** the route is *deliberately* public — `routes/web.php:144-145` says "Read-only learning
content with no tenant data, so it is reachable without an account." Added in commit `0dcad24`; the
test was never updated. It only failed once the other failures stopped masking it.

**Verified I did not cause this:** `git diff routes/web.php` shows no docs-related change from this
audit.
**Fix:** the test now asserts the documented behaviour (`assertOk`).

---

## Not changed

**`EmailMarketingService` delivery is still synchronous.** I corrected the documentation and the test
to match the deliberate design rather than the reverse. If asynchronous delivery is wanted, that is a
behaviour change requiring `ShouldQueue` on `SendMarketingEmailJob` plus a guaranteed worker — a
product decision, not a bug fix.

---

## Follow-up found while fixing #4 — `robots.txt` had the same bug, and it was worse

While fixing the sitemap fallback I checked whether `robots()` shared the pattern. It did.

**Before:** with `seo.robots_enabled` off and no checked-in file, `/robots.txt` returned
**length 0**. Measured directly:

```
source = static
length = 0
content = ''
disallows /platform? NO
```

**Why this is worse than the sitemap defect.** An empty `robots.txt` is not neutral — it forbids
nothing. The platform workspace, tenant app, POS, kitchen, QR dining, payment callbacks and webhooks
all become crawlable the moment generation is switched off. The document was silently permitting
exactly what it existed to prevent.

**Fix (`SeoSiteFiles::robots()`):** prefer a static file, then `RobotsService::defaultContent()`, and
as a last resort emit `User-agent: * / Disallow: /` — deny everything rather than silently allow it.

**Verified:** length 0 → **496**, `Disallow: /platform` now present.

**Regression test added:** `test_robots_fallback_is_never_empty_even_with_generation_disabled`,
which exercises the *fallback path* (the pre-existing test only checked `defaultContent()` in
isolation, which is why the bug survived). Negative control: with the fix stashed the new test
**fails** with "two strings are not identical" — it genuinely detects the defect.

**Final state:** 997 passed, 0 failed (6,689 assertions); `pint --test` PASS on 948 files.

---

## Release gate — green, with one configuration caveat

`composer release:check` now exits **0** (pint → build → full test suite).

**`gd` was enabled on this machine.** `C:\xampp\php\php.ini` line 922 changed from `;extension=gd` to
`extension=gd`. Backup kept at `C:\xampp\php\php.ini.backup-qa-20261114` (73,186 bytes). Verified:
`php -r "extension_loaded('gd')"` → loaded with no flags, PNG/JPEG/WebP/FreeType all available.

### Caveat: Composer's process timeout

The first `composer release:check` run exited **1** with:

```
The process "php.exe ... artisan test" exceeded the timeout of 300 seconds.
```

That is **not a test failure** — the suite itself passes. The full suite takes longer than Composer's
default 300-second per-process timeout on this machine, and the check aborted mid-run.

Fix for anyone running it locally or on a slow CI runner:

```bash
COMPOSER_PROCESS_TIMEOUT=1800 composer release:check
```

On CI this matters too: `test:php` runs `php artisan test` directly (no Composer timeout wrapper), but
the `release:check` script used locally does. Worth setting `COMPOSER_PROCESS_TIMEOUT` in the CI
variables if that script is ever invoked there.

**CI still needs `gd`:** `.gitlab-ci.yml` installs `zip pdo_mysql bcmath` but **not** `gd`. Until that
image adds `docker-php-ext-install gd`, the 9 image/QR tests will fail in the pipeline even though
they pass locally.

