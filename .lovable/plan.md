# Jivorna Visual Redesign — Deep Ink Navy

A full presentation-layer redesign of the public site and all three portals. No database, RLS, query, or business-logic changes — only tokens, layout and components.

## Locked design direction

- **Palette:** Deep Ink Navy — `#071B3A` (ink), `#0A2E63` (navy), `#B08A3C` (gold, used sparingly), `#FAFAF8` (ivory)
- **Typography:** DM Serif Display headings, Fira Sans body
- **Layout:** Full-width stacked bands with strong dark/light alternation

## What changes

### Design tokens (`src/styles.css`)
- Add an ink surface token set so dark bands are a real token, not ad-hoc classes: `--ink`, `--ink-foreground`, `--ink-muted`, `--ink-border`.
- Retune gold to be an accent only: hairlines, eyebrows, single word in a headline, one CTA state.
- Swap the font tokens to DM Serif Display / Fira Sans (loaded via `<link>` in `__root.tsx`, Cormorant/Inter removed).
- Richer elevation and depth: layered `--shadow-soft` / `--shadow-lift`, a new `--shadow-ink` for cards on dark, subtle noise/grid overlay utility, gold hairline divider utility.
- Tighten radii and spacing scale so sections breathe like Linear/Stripe rather than sitting in uniform boxes.

### Public site
- **Header:** slimmer, transparent over dark hero, solidifies to ink on scroll; gold underline on active nav; refined CTA pair.
- **Hero (`index.tsx`):** full-bleed ink band with a large DM Serif headline, gold accent word, subtle grid/glow field behind the portrait, floating stat card kept but restyled with ink glass. Trust row becomes a quiet gold-ruled strip.
- **Stats band:** borderless figures on ivory divided by gold hairlines instead of four identical cards.
- **How it works:** numbered editorial rows on ink with connecting rule, replacing the three flat cards.
- **Why Jivorna / Featured schools / Testimonials / Live jobs:** alternating ivory and ink bands, each with a distinct composition (asymmetric feature rows, marquee-style school strip, large pull-quote testimonial, dense job list with gold hover rule).
- **Footer:** ink band, logo mark large, gold rules, tidy link columns.
- **Other public routes** (`jobs`, `for-teachers`, `for-schools`, `about`, `contact`, `auth`): same band system, restyled page heroes, restyled `JobCard`, filter bar, and the auth screen as a split ink/ivory layout.

### Portals (teacher / school / admin)
- `DashboardLayout`: refined ink sidebar with gold active indicator, grouped nav, sharper header with search-free clean bar.
- `Primitives.tsx` (`StatCard`, `PageHeader`, `SectionHeading`, `EmptyState`) restyled — these propagate the new look across nearly every dashboard page automatically.
- Tables, badges, kanban columns, charts and dialogs picked up via shared components and token updates; chart colors mapped to the navy/gold palette.

## Technical notes

- Purely presentational: no changes to Supabase schema, policies, hooks, queries, or server functions.
- All colors stay as semantic tokens in `src/styles.css` — no hardcoded color utilities in components.
- Fonts load via `<link>` in `src/routes/__root.tsx` (never `@import` in CSS, per the Tailwind v4 setup).
- Existing shadcn components are restyled through variants/tokens rather than being rewritten.
- Reduced-motion guards kept for all reveal/hover motion.
- Verified after the change with a desktop and mobile screenshot pass across the public routes and one page per portal.
