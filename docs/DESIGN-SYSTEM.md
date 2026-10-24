# Touch Dine Design System

The single source of truth for how Touch Dine looks and moves. Humans and coding agents
should follow it for every UI change. Companion docs: [UI-UX.md](./UI-UX.md) (application
shell behaviour) and the agent skill in `.claude/skills/touch-dine-design/SKILL.md`.

## 1. Brand

The mark is a 2x2 grid of squares. Three squares are ink, the top-right square is brand red.

| Token | Hex | Use |
|---|---|---|
| Brand red | `#EC3013` | Primary actions, links, active states, the accent square |
| Red hover | `#D02710` | Hover on red |
| Red pressed | `#A81E0C` | Active/pressed on red |
| Ink | `#201E1D` | Text, dark panels, the three dark squares of the mark |
| Paper | `#F3F2F2` | Page and hero backgrounds, text on dark |
| Stone neutrals | Tailwind `stone-*` | Borders, secondary text (warm, matches the palette) |
| Success | `emerald-*` | Success and completed states only, never decoration |

Assets live in `public/brand/` (SVG and PNG variants). Favicons: `public/favicon.svg`,
`favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`,
`icon-512.png`. `<meta name="theme-color">` is `#EC3013` in `resources/views/app.blade.php`.

### Using the logo

- Mark only: `<ApplicationLogo className="h-8 w-8" tone="ink" | "paper" />`
  (`resources/js/Components/ApplicationLogo.tsx`). Use `tone="paper"` on dark backgrounds.
- Mark + wordmark: `<MiseLogo theme="light" | "dark" size="sm|md|lg" />`
  (`resources/js/Components/Brand/MiseLogo.tsx`) or `TouchDineLogo`.
- Never recolour the red square, add shadows, rotate, or redraw the mark. Never write
  "Restrly" or any older product name.

## 2. Colour in code

- App and admin UI use semantic Tailwind tokens: `bg-primary`, `text-primary`,
  `text-muted-foreground`, `border-border`, `bg-card`, `bg-background`. They resolve to the
  brand palette through CSS variables in `resources/css/app.css` and
  `tailwind.config.js`. Prefer these.
- Marketing pages and auth screens may use the literals `#EC3013`, `#201E1D`, `#F3F2F2` and
  `stone-*` classes.
- Do not use `indigo-*`, `purple-*`, `blue-*` or `slate-*` as brand accents. Use `primary`.
- Red is for the single most important action or state on a screen. Do not tint whole
  sections red.

## 3. Typography

- Family: **Plus Jakarta Sans** (display and body), Inter fallback. Roboto for dense tenant
  tables via `.tenant-shell` / `.app-type`. Roboto Mono only for real code, IDs and numbers.
- Marketing root: wrap pages in `MarketingLayout`, which applies `.mk-root` (headings get
  `letter-spacing: -0.025em` and balanced wrapping).
- Eyebrow label: `className="mk-eyebrow"` (12px, 700, uppercase, tracked, brand red).
- Section heading: `className="mk-h2"` (fluid 28 to 40px, weight 800).
- Minimum sizes: body 15 to 16px. Helper and hint text 13px at the smallest. **Never use
  9 to 11px text, and never use monospace for labels or step indicators.**
- Forms: labels 15px semibold, inputs 16px.

## 4. Layout and spacing

- Marketing content width: `max-w-6xl` (cards, pricing) or `max-w-7xl` (wide sections),
  horizontal padding `px-4 sm:px-6 lg:px-8`, section padding `py-16` to `py-24`.
- Card radius `rounded-2xl` on marketing, `rounded-xl` in the app. Buttons `rounded-xl`
  (marketing) or `rounded-md` (app `Button`).
- Grids of cards must be equal height: `grid items-stretch` with each card
  `flex flex-col`, the variable content `flex-1`, and the action pinned at the bottom.
  Put variable-height content (extra badges, warnings) at the bottom, and reserve
  `min-h-*` for rows that must line up across cards (price, description).

## 5. Motion

All motion is subtle, purposeful and respects `prefers-reduced-motion` (already handled in
CSS and in the helpers below).

| Need | Use |
|---|---|
| Fade and lift a block on scroll | `<Reveal delay={ms}>` from `@/Components/Marketing` |
| Count a number up on scroll | `<CountUp to={11} suffix="%" />` |
| Decorative drifting squares and grid | `<BrandSquares tone="light" | "dark" />` (parent must be `relative overflow-hidden`) |
| Logo squares pop in / red square tilts on hover | Built into `ApplicationLogo` |
| Entrance animation on a single element | Tailwind `animate-fade-up`, `animate-fade-down`, `animate-scale-in` |
| Auth panel staggered entrance | `.auth-rise` with inline `animationDelay` |

`MarketingLayout` also applies motion automatically to every page: the first section gets
the branded hero (`.mk-hero`: paper background, faint grid, floating red square), sections
fade up on scroll, and cards in a grid stagger in. Do not re-add `Reveal` around content
that already lives in a normal page section unless you need a custom delay. Pages that
supply their own hero should include a `BrandSquares` (it contains `.mk-grid`, which tells
the layout to skip its automatic hero).

Rules: durations 0.45 to 0.7s with the `cubic-bezier(0.16, 1, 0.3, 1)` ease; animate only
`opacity` and `transform`; no looping animation that is not decorative; never animate on
forms, tables or POS screens.

## 6. Page patterns

### Marketing page
`<MarketingLayout>` then `<Head>` then hero section then content sections then optional
`<FaqSection />` then a dark closing CTA block (`bg-[#201E1D]`, red primary button).
Reusable pieces in `resources/js/Components/Marketing/`: `SectionHeading`, `Button`,
`PricingPlans`, `FaqSection`, `Motion` (Reveal, CountUp, BrandSquares).

### Pricing
Always render real plans from the database via `<PricingPlans plans={plans} />`. Never
hard-code prices, plan names or feature lists. Plan feature keys map to labels in
`PricingPlans.tsx`; add a label there when you add a module. The purchase path is
`/register?plan={slug}&cycle={monthly|yearly}`; registration starts the trial on that
plan (`RegisterTenant` and `SubscriptionService::startTrial`). Payment happens later in
the tenant Subscription page.

### FAQ
Use `<FaqSection items={...} />` (defaults in `DEFAULT_FAQS`). Do not hand-build
accordions on marketing pages.

### Auth (login, register, forgot password and so on)
Wrap in `AuthSplitLayout` (dark brand panel on the left, form on the right). The form column
has class `auth-form`, which enlarges inputs (46px high, 16px) and labels (15px) with a red
focus ring. Do not add testimonials, fake customer quotes, fake certifications or
uptime claims. Sign-up is email only. Multi-step journeys use a simple numbered indicator
with real labels (see the 3-stage indicator in `Pages/Auth/Register.tsx`), not dense lists.

### Onboarding
`OnboardingLayout` shows the header with a thin red progress bar, a welcome banner when no
step is complete yet, a vertical `Stepper` with connector lines, and the step card. Add a
new step by adding a component in `Components/Onboarding/` and a case in
`Pages/Onboarding/Show.tsx`. Always provide a Skip action for optional steps via
`StepFooter`.

### Tenant and platform admin
Use `AppShell` and `PlatformLayout`, with the shadcn components in `Components/ui`
(`Card`, `Button`, `Badge`, `DataTable`, `PageHeader`, `KpiCard`, `EmptyState`,
`ConfirmDialog`). The active sidebar item has a red left bar. Admin screens are dense and
calm: no decorative motion, no gradients. Every major screen needs loading, empty, error
and success states. Card grids follow the equal-height rule in section 4.

## 7. Accessibility

- Text contrast 4.5:1 or better. White on `#EC3013` is only for bold or large text and
  buttons; use `#D02710` if a small label needs more contrast.
- Visible focus on every interactive element (`focus-visible:ring-*`).
- Icon-only buttons need `aria-label`. Toggles use `aria-pressed`.
- Respect reduced motion. Never convey status by colour alone.

## 8. Do and don't

Do: reuse components above, keep one primary red action per view, write plain concise copy,
use real data. Don't: invent statistics, testimonials or certifications; use tiny or
monospace UI text; introduce new accent colours; hard-code plan prices; leave old brand
names; add heavy animation to admin screens.

## 9. Checklist before finishing a UI change

1. `npx tsc --noEmit` and `npm run build` pass.
2. Open the page in the browser (`php artisan serve --port=8123`, with `npm run dev`
   running or after `npm run build`) at desktop and mobile widths, and check the console
   for errors.
3. Cards line up, no text under 13px, no non-brand accent colours.
4. Reduced-motion still shows all content.
