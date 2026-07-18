# Complete Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Implement the approved Quiet Concierge sign-in, responsive application shell, and complete static dashboard without changing APIs, routes, authentication, or chat behavior.

## Architecture

Keep behavior in the existing page and layout components. Treat `nav-items.ts` as the single navigation source, compose the static dashboard directly in its existing page, and centralize reusable visual tokens/responsive rules in `src/index.css`. Use existing primitives, `lucide-react`, and CSS/SVG only.

## Tech Stack

React 19, TypeScript, Tailwind/CSS semantic tokens, existing UI primitives, `lucide-react`, and React Router.

## Global Constraints

- Do not add dependencies, API calls, routes, stores, or speculative abstractions.
- Preserve existing auth submit/validation, chat behavior, and route destinations.
- Keep dashboard data static and colocated with the dashboard page.
- Preserve unrelated working-tree changes and do not commit.
- Maintain keyboard access, visible focus, semantic labels, non-color state cues, reduced motion, and 320px support.

---

### Task 1: Establish the Quiet Concierge visual foundation

**Files:**
- `src/index.css`

- [ ] Refine existing semantic page, panel, border, text, muted, primary, accent, success, warning, and destructive tokens to the approved warm-neutral and blue/indigo palette.
- [ ] Add only shared utilities/rules needed by both sign-in and dashboard for compact typography, restrained shadows, focus visibility, overflow prevention, and reduced motion.
- [ ] Retain existing Tailwind imports, Geist font setup, and dark/theme compatibility.

### Task 2: Build the responsive split sign-in

**Files:**
- `src/module/auth/pages/index.tsx`
- `src/index.css`

- [ ] Restructure presentation into a desktop editorial/product panel plus focused form panel; collapse to a single-column mobile layout.
- [ ] Reuse existing form fields and controls, preserving validation, submit/loading behavior, authentication calls, and post-login navigation exactly.
- [ ] Add concise product copy and existing `lucide-react` icons only; keep labels, errors, focus order, keyboard submit, and narrow-screen gutters accessible.

### Task 3: Complete desktop and mobile navigation

**Files:**
- `src/module/dashboard/layout/DashboardLayout.tsx`
- `src/module/dashboard/layout/nav-items.ts`
- `src/index.css`

- [ ] Render the complete navigation from `nav-items.ts` in a persistent desktop sidebar with brand, active state, primary items, and compact footer/account treatment.
- [ ] Add a mobile header, labelled menu trigger, responsive navigation panel, explicit close control, and close-on-navigation behavior using local presentation state.
- [ ] Preserve every current route target and chat entry; use text/icon/shape as well as color for active state.

### Task 4: Compose the complete static dashboard

**Files:**
- `src/module/dashboard/pages/index.tsx`
- `src/index.css`

- [ ] Add the page header and four KPI cards with static, credible values, context/trends, and `lucide-react` icons.
- [ ] Add the seven-day activity card using semantic HTML plus CSS or inline SVG, with labels/text that convey the same information accessibly.
- [ ] Add the AI insight card, report-template cards, recent-report table, and compact system-status card in the approved operational hierarchy.
- [ ] Use static arrays only where they remove repeated markup; do not add fetching, chart packages, state management, or new component files.
- [ ] Make grids wrap cleanly and transform recent-report rows into readable stacked mobile cards without duplicated content.

### Task 5: Confirm route and behavior preservation

**Files:**
- `src/app/router/index.tsx`
- `src/module/auth/pages/index.tsx`
- `src/module/dashboard/layout/DashboardLayout.tsx`
- `src/module/dashboard/layout/nav-items.ts`

- [ ] Inspect route wiring after the UI changes; edit `src/app/router/index.tsx` only if required to preserve the existing sign-in, dashboard, and chat destinations.
- [ ] Confirm no API client, auth store/hook, chat module, or route path changed.

### Task 6: Validate the implementation

**Files:**
- `src/module/auth/pages/index.tsx`
- `src/module/dashboard/layout/DashboardLayout.tsx`
- `src/module/dashboard/layout/nav-items.ts`
- `src/module/dashboard/pages/index.tsx`
- `src/index.css`
- `src/app/router/index.tsx` if changed in Task 5

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm run dev -- --host 127.0.0.1`, then verify sign-in, dashboard, and chat routes at desktop, tablet, and 320px mobile widths.
- [ ] Verify sign-in validation/loading/navigation, desktop/mobile navigation and active states, mobile menu open/close, and unchanged chat entry/behavior.
- [ ] Verify all dashboard sections, visualization labels, stacked recent reports, keyboard order, visible focus, non-color statuses, reduced motion, and absence of horizontal page scrolling.
- [ ] Review `git diff -- src/module/auth/pages/index.tsx src/module/dashboard/layout/DashboardLayout.tsx src/module/dashboard/layout/nav-items.ts src/module/dashboard/pages/index.tsx src/index.css src/app/router/index.tsx` and confirm no API, dependency, or unrelated changes.
