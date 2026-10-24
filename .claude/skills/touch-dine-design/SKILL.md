---
name: touch-dine-design
description: Touch Dine design system and UI rules. Use whenever creating or changing any page, component, layout, colour, font, logo, favicon, animation, pricing or FAQ UI, auth or onboarding screen, or admin screen in this project.
---

# Touch Dine design skill

Read `docs/DESIGN-SYSTEM.md` first. It is the source of truth; this file is the short
version for fast decisions.

## Brand in one glance
- Logo: 2x2 squares, top-right red. Use `ApplicationLogo` / `MiseLogo`. Assets in `public/brand/`.
- Colours: red `#EC3013` (hover `#D02710`, pressed `#A81E0C`), ink `#201E1D`, paper `#F3F2F2`,
  warm `stone-*` neutrals. Success states use `emerald`. No indigo/blue/purple accents.
- In the app use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`).
- Font: Plus Jakarta Sans. Body 15 to 16px, hints 13px minimum. No monospace UI labels.

## Decision rules
1. Marketing page: wrap in `MarketingLayout` (it adds the branded hero and scroll motion
   automatically). Use `SectionHeading`, `FaqSection`, `PricingPlans`, `Reveal`, `CountUp`,
   `BrandSquares` from `@/Components/Marketing`.
2. Pricing: render DB plans through `PricingPlans`. Never hard-code prices or features.
   CTA is `/register?plan={slug}&cycle=...`.
3. Auth: wrap in `AuthSplitLayout`. Email-only sign-up. No fake testimonials, certifications
   or stats.
4. Onboarding: `OnboardingLayout` + `Components/Onboarding/*`, registered in
   `Pages/Onboarding/Show.tsx`.
5. Admin: `AppShell` / `PlatformLayout` + `Components/ui/*`. Dense, calm, no decorative
   motion. Equal-height card grids (`items-stretch`, `flex flex-col`, `flex-1` body,
   actions pinned to the bottom, variable content last).
6. Motion: only `opacity`/`transform`, 0.45 to 0.7s, respect `prefers-reduced-motion`.

## Never
- Invent customer quotes, numbers, uptime or compliance claims.
- Use text under 13px, or monospace for labels and steps.
- Write old brand names (Restrly) or recolour the logo.
- Add new accent colours or gradients to admin screens.

## Before you finish
Run `npx tsc --noEmit` and `npm run build`. Check the page in the browser at desktop and
mobile widths and read the console. Then confirm cards align and nothing is below 13px.
