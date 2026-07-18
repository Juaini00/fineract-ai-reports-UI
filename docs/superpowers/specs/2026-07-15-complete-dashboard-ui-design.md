# Complete Dashboard UI Design

**Status:** Approved design specification  
**Date:** 2026-07-15  
**Commit status:** Not committed; the user did not request a commit.

## Goal

Deliver a complete, responsive frontend presentation for sign-in and the report dashboard in the approved **Quiet Concierge** direction: calm, compact, and operationally clear without changing application behavior or APIs.

## Scope and constraints

- Presentation only: preserve authentication, routing, chat behavior, and every API contract.
- Reuse existing UI primitives and `lucide-react`; add no chart or UI dependency.
- Dashboard content is static representative UI. Do not invent data fetching or backend integration.
- Use CSS/SVG for the activity visualization and existing semantic tokens for color and surfaces.
- Support desktop and mobile without horizontal overflow.

## Visual system

- **Color:** warm neutral page and panel surfaces with calm blue/indigo accents. Reserve saturated color for primary actions, focus, and meaningful status.
- **Type:** compact Geist typography, short labels, tabular numerals for metrics, and restrained heading scale.
- **Depth:** subtle borders and low shadows; hierarchy comes primarily from spacing, typography, and surface contrast.
- **Shape:** consistent medium radii, compact controls, and comfortable touch targets.
- **Motion:** brief, optional transitions only; honor reduced-motion preferences.

## Sign-in

- At desktop widths, use a balanced split screen: a quiet branded/editorial panel and a focused form panel.
- The editorial panel communicates the product purpose and may include a compact trust/benefit list; it must not distract from sign-in.
- The form retains the existing fields, validation, loading state, submission, and navigation behavior.
- On mobile, collapse to one column, reduce decorative content, and keep the form first-class within safe gutters.
- Use visible labels, logical heading order, keyboard submission, visible focus, and non-color-only error treatment.

## Application shell and navigation

- Desktop uses a persistent, visually quiet sidebar with brand, primary navigation, a clear active item, and a compact account/footer area.
- Mobile replaces the persistent sidebar with a compact header and labelled menu trigger. The opened navigation uses the same items and exposes an explicit close action.
- Keep navigation configuration in `nav-items.ts`; do not duplicate item definitions between layouts.
- Preserve existing routes and keep chat reachable and behaviorally unchanged.

## Dashboard information architecture

1. **Page header:** greeting/context, date or concise supporting copy, and one clear report action.
2. **KPI row:** four compact cards for reports generated, time saved, completion rate, and active automations; each has a label, primary value, trend/context, and icon.
3. **Activity:** the dominant card, showing a seven-day report-activity visualization with an accessible text summary or labelled values.
4. **AI insight:** a highlighted but restrained recommendation card with concise rationale and one action.
5. **Report templates:** scannable template cards with icon, title, description, cadence/context, and generate action.
6. **Recent reports:** responsive table/list showing report, status, owner/source, date, and action. Mobile rows become stacked cards rather than a clipped table.
7. **System status:** compact service rows with icon, label, status text, and non-color indicator.

The header and KPIs establish current state; activity and insight explain what deserves attention; templates and recent reports provide next actions; system status remains secondary.

## Responsive behavior

- Wide desktop: fixed sidebar and a bounded content canvas; activity and insight share the primary grid.
- Tablet: narrower sidebar/content gaps and wrapping KPI/template grids.
- Mobile: sidebar becomes a menu, header actions stack, cards become one column, visualization remains legible, and recent reports use stacked rows.
- Interactive controls retain at least comfortable touch height; content must work at 320px without horizontal page scrolling.

## Accessibility and content states

- Use semantic landmarks, headings, navigation labels, table semantics where a table remains, and descriptive button names.
- Do not rely on color alone for active navigation, trends, report statuses, or service health; pair color with text/icons.
- Preserve visible focus and sufficient contrast; decorative icons are hidden from assistive technology.
- Static sections include credible populated content. Also ensure empty/reduced-content layouts do not collapse or leave unexplained blank regions.
- The visualization exposes its meaning through adjacent text/labels rather than requiring SVG interpretation.

## Acceptance criteria

- Sign-in renders as a responsive split layout while existing authentication behavior remains intact.
- Desktop and mobile navigation expose the complete existing navigation set and preserve all routes.
- Dashboard contains the header, four KPIs, activity visualization, AI insight, templates, recent reports, and system status in the hierarchy above.
- No API, auth, chat, route contract, or dependency changes are introduced.
- Keyboard navigation, focus, labels, status meaning, reduced motion, and 320px responsiveness are manually verified.
- `npm run lint` and `npm run build` pass.

## Implementation files

- `src/module/auth/pages/index.tsx`
- `src/module/dashboard/layout/DashboardLayout.tsx`
- `src/module/dashboard/layout/nav-items.ts`
- `src/module/dashboard/pages/index.tsx`
- `src/index.css`
- `src/app/router/index.tsx` only if route wiring must be preserved or corrected; no new routes are required.
