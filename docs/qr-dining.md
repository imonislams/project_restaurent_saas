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

## QR design panel

**Restaurant Operations → QR Designer** (`/qr-dining/designs`) covers both branded
surfaces in one place:

**Table card (printed).** A Canva-style editor for the card that sits on each table.

- Element vocabulary is deliberately small — `text`, `rectangle`, `ellipse`, `line`,
  `image`, `qr` — positioned in **millimetres** on a fixed card size.
- Text may use `{{restaurant}}`, `{{branch}}`, `{{table}}` and `{{area}}` placeholders;
  they are filled per table when printing or previewing.
- Designs are **per branch**. Resolution when printing: the branch's active design →
  the company-wide active design (`branch_id` null) → the built-in default (created on
  first use). The design list shows a branch's own designs *plus* the company-wide ones.
- The **server render is authoritative**: `GET /qr-dining/designs/{design}/preview`
  returns the card HTML the PDF uses, shown in the inspector's preview panel. After
  saving, the panel refreshes so the preview and the PDF always agree.
- **Download PDF** renders one card per page for every table in the branch, each with
  its own QR. "Print all" on the Table QR Codes page now uses the active design too.

**QR menu page (diners).** Branding for the page a guest sees after scanning
(`/qr/{token}`, `/qr/{token}/tracking`):

| Key | Meaning |
|---|---|
| `qr.branding.primary_color` / `accent_color` / `background_color` | Theme colours |
| `qr.branding.header_style` | `light`, `brand` or `dark` header |
| `qr.branding.show_logo` / `show_table_name` | What the header shows |
| `qr.branding.welcome_title` / `welcome_text` | Optional banner above the menu |
| `qr.branding.footer_text` | Footer line |

Stored in `qr.branding` on `branches.settings` (per branch) falling back to
`tenants.settings` and then the built-in defaults, resolved by
`App\Domain\Dining\QrBrandingSettings`. Colours become CSS variables
(`--qr-primary`, `--qr-primary-text`, …) on `QrLayout`; the text colour paired with a
brand colour is computed server-side for contrast, so a pale primary colour can never
produce unreadable labels. A tenant that never customises anything keeps the current look.

### PDF-safe limits

The export can only reproduce what DomPDF supports, and the editor says so:

- No rotation, gradients, shadows or blur — positions, solid colours, borders, corner
  radius, text alignment/weight/italic/underline, letter-spacing and line-height only.
- Fonts are limited to what DomPDF ships (DejaVu Sans / Serif / Mono). **Bengali card
  typography needs a bundled Bengali TTF**, which is not in the repository yet; until
  then card text renders in the Latin PDF-safe set.
- Images (the restaurant logo, or an uploaded card image ≤ 1.5 MB) are embedded as data
  URIs. They fill their box — the export does not preserve an image's aspect ratio.

## Permissions

Added to the RBAC catalog and `RolePermissionSeeder`:

- `qr.view`, `qr.manage`, `qr.settings`, `qr.analytics`
- `modifiers.view`, `modifiers.manage` (menu add-ons)

The design panel reuses these — viewing and exporting need `qr.view`, editing designs
needs `qr.manage`, and saving the QR menu branding needs `qr.settings`. No new
permission was introduced.

Plan feature `qr_dining` gates the admin routes and sidebar entry.

## Deployment

```bash
php artisan migrate --force   # additive only; safe to run live
npm run build
```

No new queues, storage links or services. `endroid/qr-code` generates the QR
images/SVGs and the printable PDF cards.

The design panel adds one **additive** table, `qr_card_designs` (tenant + nullable
branch, name, `canvas` JSON, active flag), so `php artisan migrate --force` is safe to
run live. Uploaded card images are stored on the existing `public` disk under
`qr-designs/{tenant_id}`.

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
