# QR Smart Dining (app-less ordering)

Customers scan a table QR code, browse the menu and order from their phone —
no app install, no account. QR orders are ordinary POS orders: same pricing
engine, same kitchen pipeline, same payments.

## How it works

1. Each table has a rotatable, high-entropy **QR token** (`table_qr_tokens`).
   Management: **Restaurant Operations → Table QR Codes** (`/qr-dining/tables`).
2. Scanning `/qr/{token}` resolves the tenant/branch/table server-side
   (`ResolveQrContext`) and starts (or joins) the table's **dining session**.
3. The session credential travels in an HttpOnly cookie (`dining_session`,
   scoped to `/qr`) or the `X-Dining-Token` header; each device also gets a
   `participant_token`.
4. Orders are created through `SaleService::openQrOrder()` — the existing
   calculator/numbering/stock/kitchen engine. `source=qr`, linked to the session
   and participant.
5. Customers track progress on `/qr/{token}/tracking`, which polls
   `/qr/{token}/status` (no websockets — matches the KDS polling pattern).
6. Bills: request the bill (staff settle in the POS) or pay online via the
   tenant's configured gateway. Sessions close only when every order is
   settled and fully paid.

## Configuration

Tenant settings live in `tenants.settings` under `qr.*` and are managed at
**Settings → QR Dining** (`/settings/qr`):

| Key | Meaning |
|---|---|
| `qr.enabled` | Master switch for the public flow |
| `qr.guest_checkout` | Allow ordering without an account (default on) |
| `qr.require_phone` / `qr.require_email` | Require contact details |
| `qr.session_timeout_minutes` | Session expiry window |
| `qr.auto_accept` | On = straight to kitchen; off = staff confirm first |
| `qr.allow_additional_orders`, `qr.allow_notes` | Ordering UX |
| `qr.live_tracking` | Show the tracking timeline |
| `qr.allow_bill_request` | Customer can request the bill |
| `qr.billing_mode` | `consolidated` or `individual` |
| `qr.digital_receipt`, `qr.feedback`, `qr.loyalty` | Post-order features |

All values are enforced **server-side** (`App\Domain\Dining\QrDiningSettings`).

Online payments use the existing `payments.provider` gateway setting
(`manual` = paid at the table immediately; `stub` = pending until a signed
webhook confirms). No new provider is introduced.

## Permissions

Added to the RBAC catalog and `RolePermissionSeeder`:

- `qr.view`, `qr.manage`, `qr.settings`, `qr.analytics`
- `modifiers.view`, `modifiers.manage` (menu add-ons)

Plan feature `qr_dining` gates the admin routes and sidebar entry.

## Deployment

```bash
php artisan migrate --force   # additive only; safe to run live
npm run build
```

No new queues, storage links or services. `endroid/qr-code` generates the QR
images/SVGs and the printable PDF cards.

## Operations

- **Regenerate/revoke** a table QR from the Table QR Codes page — the old token
  stops resolving immediately (`410`).
- **Reject** a pending QR order from Orders or the POS; reserved stock is
  returned.
- **Close** sessions automatically on settlement, or when expired.
- **Analytics**: Restaurant Operations → QR Analytics (`/qr-dining/analytics`).

## Security

- Table tokens are opaque 64-char secrets, revocable; they identify a table,
  never a session or customer.
- The tenant/branch is bound server-side from the token; every query is
  tenant-scoped. Cross-tenant access is impossible.
- Public endpoints are rate limited (`qr-public`, `qr-session`, `qr-order`).
- Prices are always recomputed server-side (`SaleCalculator`); client prices
  are ignored.
- Orders are idempotent (`idempotency_key`); payments never settle on a browser
  redirect — only a verified webhook or an authorized staff settlement.
- Participants cannot see another participant's contact details; individual
  billing scopes orders to their owner.

## Tests

`tests/Feature/Qr/*` and `tests/Feature/Menu/Modifier*` cover token rotation,
tenancy isolation, guest ordering, price overrides, idempotency, modifier
pricing, staff accept/reject, bill request, counter and online settlement,
closed-session lockout, feedback and analytics.
