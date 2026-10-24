# Touch Dine (restaurant SaaS)

Laravel 12 + Inertia + React + TypeScript + Tailwind 3 (shadcn/Radix components).

## Commands
- Dev: `npm run dev` (Vite) and `php artisan serve`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Tests: `php artisan test`

## Design and UI
Any UI work must follow `docs/DESIGN-SYSTEM.md` (brand colours, logo, fonts, motion, page
patterns). The `touch-dine-design` skill in `.claude/skills/` summarises it; load it before
changing pages, components, colours, fonts, logos, pricing, auth, onboarding or admin UI.
Application-shell behaviour rules are in `docs/UI-UX.md`.

## Conventions
- Frontend lives in `resources/js` (pages in `Pages/`, shared UI in `Components/`, layouts in `Layouts/`).
- Public marketing pages are served by `app/Http/Controllers/MarketingController.php`; plans come from the `Plan` model.
- Local seeded accounts are defined in `database/seeders/DatabaseSeeder.php`.
