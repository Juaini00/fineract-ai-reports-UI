# Quiet Concierge Chat UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Implement the approved quiet-concierge chat presentation and client display behavior without changing backend semantics or the documented chat integration contract.

## Architecture

Keep the existing chat hook as the sole source of job state, deriving presentation-only timeline and sanitized error values from it. Update the existing React shell and CSS semantic tokens without changing API, SSE, or job behavior.

## Tech Stack

React, TypeScript, existing Tailwind/CSS semantic tokens, and the current chat hook/SSE integration.

## Global Constraints

- Do not change APIs, SSE payloads, backend job semantics, or dependencies.
- No commit requested; do not create one.
- Preserve `doc/task/chat-client-integration.md` intact and authoritative.
- Use semantic dark-mode tokens for page, panel, elevated panel, border, text, muted text, accent, success, and error; avoid one-off colors.
- Sanitize all server/SSE/job errors before rendering: no raw payloads, stack traces, tokens, or internal IDs.
- Preserve keyboard access, visible focus, labelled controls, polite meaningful status announcements, non-color state cues, reduced-motion behavior, and responsive layouts.
- Keep the existing flow: `ChatList.send` → `useChat.sendMessage` → start job → SSE → `activeJob`/`statusText`/clarification. The timeline is display-only, not a second job state machine.

---

### Task 1: Establish semantic surfaces and compact sign-in

**Files:**
- `src/index.css:51-150`
- `src/module/auth/pages/index.tsx:22-120`

- [ ] Add/reuse CSS custom properties for the approved semantic dark surfaces and apply them to page/card/form states; include `:focus-visible` and `@media (prefers-reduced-motion: reduce)` overrides.
- [ ] Rework the existing sign-in markup into one semantic main/card region with product heading, concise supporting copy, vertically ordered labelled fields, existing validation, and the existing primary submit action.
- [ ] Add narrow-screen gutters/full-width card rules; retain native keyboard submit and prevent horizontal overflow.
- [ ] Do not alter auth requests, validation rules, routes, or submit state logic.

**Implementation shape:**
```css
:root {
  --surface-page: var(--background);
  --surface-panel: var(--card);
  --surface-elevated: var(--popover);
  --border-subtle: var(--border);
  --text-primary: var(--foreground);
  --text-muted: var(--muted-foreground);
  --accent: var(--primary);
  --status-success: var(--success);
  --status-error: var(--destructive);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

### Task 2: Derive safe timeline and display errors from existing hook state

**Files:**
- `src/module/chat/types/index.ts:1-55`
- `src/module/chat/hooks/useChat.ts:10-11,43-71,73-86,123-378`

- [ ] Add display-only timeline types and a pure mapper from current known job/status data to ordered valid steps; ignore missing, duplicate, stale, and out-of-order notifications rather than claiming unsupported progress.
- [ ] Add a pure error sanitizer that returns stable human-facing text, preserving typed composer input on recoverable failures.
- [ ] Expose only derived timeline/error display values alongside existing hook state; retain existing start, subscribe, clarification, job-status recovery, and send behavior.
- [ ] On clarification, render `Need your input`; on terminal success, expose a compact completed state; on terminal error, expose sanitized text and only actions the existing integration can perform.

**Implementation shape:**
```ts
export type TimelineStep = 'queued' | 'context' | 'analyze' | 'query' | 'prepare' | 'done';
export type TimelineState = { step: TimelineStep; label: string; state: 'complete' | 'active' | 'pending' };

const TIMELINE_LABELS: Record<TimelineStep, string> = {
  queued: 'Queued', context: 'Context', analyze: 'Analyze', query: 'Query', prepare: 'Prepare', done: 'Done',
};

export function sanitizeJobError(error: unknown): string {
  return typeof error === 'string' && /network|disconnect/i.test(error)
    ? 'Connection interrupted. Check your connection and reload to restore this job.'
    : 'We could not complete that report. Please try again when available.';
}
```

### Task 3: Make session navigation a responsive shell concern

**Files:**
- `src/module/chat/components/ChatWrapper.tsx:8-84`
- `src/module/chat/components/SessionList.tsx:6-145`
- `src/index.css:51-150`

- [ ] Retain the desktop secondary session rail and active-session selection using existing session data/actions.
- [ ] Add a compact labelled mobile sessions toggle/panel backed by the same `SessionList`; hide the persistent rail below the existing desktop breakpoint.
- [ ] Keep the active-session context visible, give controls comfortable touch targets, and close the mobile panel after selecting a session without adding navigation state outside the shell.
- [ ] Use semantic `main`, `nav`, and labelled controls; selection must have text/indicator in addition to color.

### Task 4: Upgrade transcript/composer behavior without changing sends

**Files:**
- `src/module/chat/components/ChatList.tsx:9-206`
- `src/module/chat/hooks/useChat.ts:123-378`
- `src/index.css:51-150`

- [ ] Add a transcript scroll ref and near-bottom check; autoscroll after a user send and while already near the bottom only.
- [ ] When new assistant activity arrives while the reader is above the threshold, retain scroll position and show a compact `New activity` button that scrolls to the latest message.
- [ ] Render the hook-derived active timeline below the in-flight assistant response, with a polite live region that announces meaningful step changes only.
- [ ] Guard the existing send handler against blank/whitespace input, missing active session, and existing unsafe busy/send/job state; show why the composer is unavailable and do not duplicate submissions.
- [ ] Keep typed text on recoverable error and do not steal focus during streamed updates.

**Implementation shape:**
```tsx
const isNearBottom = (node: HTMLElement) =>
  node.scrollHeight - node.scrollTop - node.clientHeight < 96;

const canSend = message.trim().length > 0 && Boolean(activeSession) && !isSending && !activeJob;

<button type="button" onClick={scrollToLatest} aria-label="Show latest chat activity">
  New activity
</button>
```

### Task 5: Apply semantic assistant/result and timeline presentation

**Files:**
- `src/module/chat/components/AssistantResponse.tsx:6-76`
- `src/module/chat/components/ChatList.tsx:9-206`
- `src/index.css:51-150`

- [ ] Differentiate user prompts, assistant work, results, errors, and structured/preformatted result content using semantic classes and the new tokens.
- [ ] Render completed/current/pending timeline steps with text and icons/markers, not color alone; collapse terminal success to a concise completed summary.
- [ ] Give sanitized errors an accessible role/message treatment and use retry/reload wording only when the current hook exposes that action.
- [ ] Preserve existing result rendering/data shape; do not parse or transform backend output beyond presentation.

### Task 6: Verify the client build and acceptance paths

**Files:**
- `src/module/auth/pages/index.tsx:22-120`
- `src/module/chat/components/ChatWrapper.tsx:8-84`
- `src/module/chat/components/ChatList.tsx:9-206`
- `src/module/chat/components/SessionList.tsx:6-145`
- `src/module/chat/components/AssistantResponse.tsx:6-76`
- `src/module/chat/hooks/useChat.ts:10-11,43-71,73-86,123-378`
- `src/module/chat/types/index.ts:1-55`
- `src/index.css:51-150`

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Manually verify sign-in at desktop/narrow widths: labels, validation, keyboard submit, focus, and no overflow.
- [ ] Manually verify chat desktop rail and mobile session picker, active selection, touch targets, transcript/composer width, and reduced motion.
- [ ] Manually verify blank/busy/missing-session send guards, no duplicate send, near-bottom autoscroll, retained reading position, and `New activity` action.
- [ ] Manually exercise existing active job, clarification, terminal success, terminal error, SSE disconnect/refresh recovery; confirm the six labels, `Need your input`, compact completion, sanitized errors, and no API calls/payloads changed.
