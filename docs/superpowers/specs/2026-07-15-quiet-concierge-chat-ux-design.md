# Quiet Concierge Chat UX Design

**Status:** Approved design specification  
**Date:** 2026-07-15  
**Commit status:** Not committed; the user did not request a commit.

## Goal

Make sign-in compact and calm, and make report chat feel like a quiet concierge: readable, responsive, and transparent about work without exposing implementation noise.

## Scope and constraints

- Preserve the existing integration described in `doc/task/chat-client-integration.md`.
- Make no API-contract changes and add no dependencies.
- Reuse existing SSE events and the existing job-status endpoint for recovery.
- This design changes presentation and client behavior only; it does not change application logic or backend job semantics.

## Information architecture

### Sign-in

- Use a centered, compact sign-in card with a clear product heading, one primary action, and concise supporting copy.
- Keep fields, labels, validation, and submit affordance vertically ordered and keyboard-first.
- On narrow screens, the card becomes full-width within safe page gutters; no horizontal scrolling or decorative content that competes with authentication.

### Desktop chat

- Use a primary chat column and a secondary session rail.
- The session rail contains prior/current sessions and the action to start a session; the active session is visibly selected.
- The chat column owns the conversation header, scrollable transcript, active-message status timeline, and bottom composer.
- Keep result content visually distinct from prompts, with readable type, useful line length, whitespace, and structured rendering where existing result data supports it.

### Mobile chat

- Prioritize the transcript and composer at all sizes below the desktop breakpoint.
- Hide the persistent session rail; expose sessions through a compact collapsible control/sheet when needed.
- Keep the composer reachable above mobile browser chrome and preserve comfortable touch targets.

## Components

- **SignInScreen:** semantic page, compact authentication card, inline validation and submit state.
- **ChatShell:** responsive layout owner for session navigation and active chat.
- **SessionRail / SessionPicker:** desktop rail and mobile collapsed entry point, both backed by the existing session model and actions.
- **Transcript:** scroll container that renders user, assistant, result, and error messages with accessible grouping.
- **ActiveMessage:** renders the in-flight assistant response and mounts its status timeline directly beneath it.
- **JobTimeline:** derives a compact stepper from existing SSE/job state; it is display-only and does not invent a second job state machine.
- **Composer:** guarded input and submit controls, including disabled/busy states and a visible explanation when sending is unavailable.

## Job timeline and data flow

1. The existing chat integration starts/subscribes to a job and receives its current SSE-derived state.
2. The client maps existing job steps to this ordered display sequence: **Queued**, **Context**, **Analyze**, **Query**, **Prepare**, **Done**.
3. The active or completed step is rendered beneath the active assistant message; completed steps are compact, and the current step has a non-color-only active indicator.
4. A clarification pause renders **Need your input** in place of forward progress, retaining the prior completed steps and enabling the existing clarification path.
5. On a terminal success state, collapse the timeline to a compact completed summary. On a terminal failure, replace internal details with a sanitized, actionable error message and retry/recovery affordance where the current integration permits it.
6. If SSE disconnects or the page refreshes while a job is active, query the existing job endpoint, restore the message/timeline from that result, and resume the existing subscription behavior when available.

The UI must tolerate missing, duplicate, or out-of-order status notifications by rendering the latest known valid step without claiming progress that the job state does not support.

## Composer and scrolling behavior

- Guard submission when input is empty/whitespace, no active session is available, or an existing send/job state makes another submission unsafe.
- Preserve typed input on recoverable errors; prevent accidental duplicate sends while a request is pending.
- Autoscroll only when the viewer is already near the bottom of the transcript. If they have scrolled upward, retain position and show a compact “new activity” affordance instead.
- On a user send, move to the latest message; do not repeatedly steal focus or scroll during streamed updates when the viewer has navigated away.

## Error, privacy, and accessibility requirements

- Sanitize server/SSE/job errors before display: use stable human-language copy, omit stack traces, tokens, raw payloads, and internal identifiers.
- Keep retry/reload language specific to the available action; do not promise a retry if the current flow cannot perform one.
- Use semantic landmarks, labelled controls, visible focus indicators, and logical heading order.
- Announce meaningful status changes through an appropriate polite live region without announcing every streamed token or duplicate SSE event.
- Do not rely on color alone for active, selected, error, or completed state. Maintain contrast across semantic dark-mode surface, border, text, and muted-text tokens.
- Respect reduced-motion preferences; status transitions should not be required to understand progress.

## Responsive and visual behavior

- Use semantic dark-mode surface layers (page, panel, elevated panel, border, primary text, muted text, accent, success, warning/error) rather than one-off color values.
- Desktop keeps the session rail secondary and visually quiet; the transcript remains the reading focus.
- Mobile collapses session navigation, retains the active-session context, and gives the transcript the full available width.
- Results favor readable line length, hierarchy, paragraph spacing, lists, and preformatted/structured sections already provided by the application.

## Acceptance criteria and testing

- Sign-in is usable at desktop and narrow mobile widths, with labelled fields, keyboard submit, visible validation, and no overflow.
- Desktop shows a secondary session rail; mobile does not consume persistent chat width for it and can still reach sessions.
- Sending is blocked for invalid/unsafe composer states and does not create duplicate submissions.
- Transcript follows new activity only near the bottom; scrolling up retains reading position and exposes a new-activity cue.
- Existing SSE/job states visibly map to Queued, Context, Analyze, Query, Prepare, Done; clarification shows Need your input; terminal success collapses; failures are sanitized.
- Refresh/disconnect recovery uses the existing job endpoint and does not require a new API.
- Keyboard navigation, focus visibility, screen-reader labels/live status, contrast, and reduced-motion behavior are verified.
- Run the existing targeted client/component tests plus responsive manual checks for sign-in, desktop chat, mobile chat, active job, clarification, error, and refresh recovery.

## Files likely affected during implementation

- Existing sign-in screen/component and its styles.
- Existing chat shell, transcript/message rendering, session navigation, and composer components/styles.
- Existing client-side SSE/job-status integration only where it supplies display state and refresh recovery.
- Existing targeted chat/sign-in component or integration tests.
- `doc/task/chat-client-integration.md` remains intact and authoritative for the current integration contract.
