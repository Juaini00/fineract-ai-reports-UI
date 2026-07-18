# Complete Chat Contract Integration and Claude-Focused UX

**Status:** Approved design, revised to the current contract  
**Date:** 2026-07-18  
**Contract source:** `doc/task/chat-client-integration.md`

## Purpose

Complete the existing dashboard chat against the current backend contract while preserving the router, React Query, Zustand, Axios, and `src/module/chat/{types,service,hooks,components}` structure. The UI remains a focused Claude-style workspace: quiet history, a reading-first transcript, calm progress, inline clarification, and faithful structured reports.

Client-owned copy is English. Assistant language and content remain backend-driven.

## Contract and Authentication

Every JSON response uses `{ success, data, error }`. Every `/chat/**` request requires an active administrator bearer token:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

`X-API-Key` is optional. When valid, it narrows the administrator's permitted office scope. An invalid, expired, or revoked key is ignored; it neither authenticates nor blocks chat. The UI therefore never gates chat on a key. Optional key controls live in a non-blocking scope panel and explain that the key only narrows access.

Supported chat endpoints are session list/create/detail/messages, job create/detail/stream, and same-job responses. Job audit is optional diagnostics and is not a rendering or recovery dependency. Key listing, cancellation, rename/delete, and other absent endpoints are not added.

Authentication refresh is coordinated across concurrent requests: one refresh request, one replay of each failed request, and no loop. Login, refresh, and logout use `credentials: "include"`. A second `401` clears local auth and follows the existing signed-out path. Chat maps `400`, `403`, and `404` to safe actionable copy. HTTP `500` or `internal_error` always renders fixed generic copy, never the backend message.

## Architecture and Ownership

- React Query owns server sessions and messages; keys include authenticated user and session identity.
- Zustand owns only small user/session-scoped UI state such as selection and drafts.
- Axios remains the envelope-aware JSON transport. Authenticated SSE uses `fetch` streaming because native `EventSource` cannot set bearer headers.
- `useChat` remains the component-facing facade. A focused job controller/hook may own durable status branching, stream lifecycle, clarification, and reconciliation.
- PostgreSQL-backed job/session/message reads are durable truth. SSE is a lossy live hint.
- Persist only the minimum active-job identity needed for reload recovery, scoped by user and session. Never persist bearer tokens, API keys, optimistic transcript data, stream events, or raw errors.
- Chat-specific behavior stays in `src/module/chat`; generic coordinated authentication refresh stays in `src/app/config`.
- No new dependency or shared transport/state abstraction is introduced. Vitest remains Node-only.

## Data Model

`ChatSession` includes nullable `user_id` and nullable `api_key_id`, plus the existing id, title, status, context, timestamp, expiry, and archive fields. Titles are at most 120 characters; blank titles normalize to `null`.

`POST /chat/jobs` accepts:

```ts
type StartChatJob = { session_id: string | null; message: string };
```

`message` is 1-1000 characters. A null or absent `session_id` creates a session and the `201` returns its `session_id`, `job_id`, `user_message_id`, `status`, and `current_step`. The handler currently awaits the graph, so the response is commonly already `completed`, `waiting_for_user_input`, or `failed`; status must be handled before opening SSE.

Persisted assistant messages use `metadata_json.assistant_response` as their structured source and `content` as markdown fallback. A job instead exposes in-progress/recovery output under `result_json.structured_response` and `result_json.markdown`. These shapes must not be conflated.

Clarification uses:

```ts
type ChatJobResponse = { message: string; option_id?: string };
```

`message` is 1-1000 characters and `option_id`, when present, is at most 200 characters.

## End-to-End Flows

### Entry and New Chat

1. Resolve the authenticated administrator and load sessions; optionally attach a nonblank scoped key.
2. Restore a selected session only if it still belongs to the current user's visible session list.
3. Load selected-session messages in backend order and recover any persisted active job by calling `GET /chat/jobs/{id}` first.
4. “New chat” selects a local empty intent. It does not create a blank session.
5. On the first valid prompt, call `POST /chat/jobs` with `session_id: null`, adopt the returned `session_id`, `job_id`, and durable user message identity, then branch immediately on returned status.
6. For an existing session, submit its id. Normal send is locked only for that session while its job is queued, running, or waiting.

### Status-First Job Handling

| Durable status | UI and action |
| --- | --- |
| `queued` / `running` | Show a calm current-step label and open SSE. |
| `waiting_for_user_input` | Show clarification from job result or persisted assistant metadata; do not open SSE or create another job. |
| `completed` | Fetch messages, render the persisted assistant response, then unlock send. |
| `failed` | Reconcile durable state, show safe copy, then unlock send. |
| other recovered terminal state | Close the stream, reconcile, and show neutral safe copy. |

Known step names map to concise labels. Unknown steps use “Working on your request”; no percentages or fabricated timeline are shown.

### Same-Job Clarification

Clarification always posts to `/chat/jobs/{job_id}/responses` for the same job. A returned choice sends its exact backend `id` and visible label. Parameter entry and ordinary free text omit `option_id`; no special `others` id is invented.

Free-text clarification renders even when the backend supplies no options. Choice and free-text controls are disabled during submission to prevent duplicates. Invalid input or a safe server rejection leaves the clarification visible.

The `201` body is the inserted clarification `ChatMessage`, not job state. After every successful response, fetch `GET /chat/jobs/{job_id}` and branch on its durable status. Open SSE only for `queued` or `running`. An inaccessible or no-longer-waiting job may return `404`, which triggers durable reconciliation rather than a presumed `409` flow.

### SSE and Durable Recovery

SSE sends exactly `status` and `update` event names. `status` data is `{ job_id, status, current_step }`; `update` data is `{ kind, step, payload, at }`. `clarification`, `final`, and `error` are update kinds, not event names. Unknown event names are ignored.

The fetch-stream parser handles arbitrary UTF-8 chunks, CRLF/LF framing, multiline data, and malformed events without losing later valid events. It includes the bearer header and includes `X-API-Key` only when a nonblank optional key is selected. Credentials never appear in URLs.

Redis repeatedly exposes only its latest update, not an ordered log. Deduplicate updates by a stable serialization of `kind`, `step`, `payload`, and `at`, and keep rendering idempotent. There is no replay cursor or reliable event history.

All events are hints:

- `update.kind: clarification` triggers durable job reconciliation.
- `update.kind: final` or `error` triggers job and message reconciliation.
- Stream close, parse/network failure, or reload triggers `GET /chat/jobs/{id}`.
- Reopen only when durable status is `queued` or `running`.
- Restore clarification for `waiting_for_user_input`; fetch messages for `completed`; show safe copy for `failed`.

The client does not wait for SSE before handling either job-creation or clarification HTTP results.

### Ambiguous Mutating Failures

Never automatically retry `POST /chat/jobs` or a clarification response after a network/`500` outcome that may have persisted. Reconcile accessible sessions, job state, and messages first, then offer a deliberate user action. Definite validation failures may be corrected and resubmitted.

## Rendering and Claude-Focused UI

`ChatWrapper` provides the full-height workspace. Desktop uses a compact collapsible history rail; mobile uses an accessible drawer. The transcript remains the visual focus. The optional scope panel never blocks normal chat and does not claim that a key authenticates the user.

`SessionList` shows title, recency, selection, loading, empty, and error states. It supports selection and New chat intent only.

`ChatList` is reading-first: assistant responses are document-like and user prompts restrained. Empty examples mention reporting areas without promising unsupported actions. Near-bottom users auto-scroll; users reading earlier content retain position and get “Jump to latest”. Draft and scroll state do not leak between sessions.

`AssistantResponse` prefers a valid persisted `metadata_json.assistant_response`, then markdown `content`. For active/recovery UI it may use `result_json.structured_response`, then `result_json.markdown`. It renders only returned summaries, sections, ordered table columns and rows, cards, options, warnings, actions, and safe evidence references. Empty tables say no rows were returned. Unknown or malformed structured shapes fall back safely; no rows, metrics, labels, counts, SQL, prompt data, diagnostics, or internal errors are invented or exposed.

`ClarificationPrompt` supports returned choice buttons and a labeled free-text field independently; free text is available when options are empty. `JobProgress` shows one low-motion status line. `ChatComposer` auto-resizes to a bounded height, sends on Enter, inserts a newline on Shift+Enter, and has an explicit send button.

## Accessibility and Responsive Behavior

- Controls have accessible names, visible focus, logical order, and comfortable touch targets.
- Status uses a polite live region; errors use an alert without repeatedly announcing progress.
- Clarification uses buttons and labeled text input; state is not conveyed by color alone.
- Transcript, tables, history, scope panel, and composer remain usable on narrow screens and at browser zoom.
- Wide tables scroll within the message. The composer respects safe-area insets.
- Reduced motion disables nonessential animation.
- Semantic headings, lists, tables, and `aria-expanded` are used where applicable.

## Error and Security Rules

- `400`: preserve form/clarification state and show safe correction guidance.
- `401`: one coordinated refresh and replay; a second `401` clears auth.
- `403`: state that administrator access is required.
- `404`: state that the session/job/current operation is unavailable and reconcile.
- `500` / `internal_error`: always use fixed generic copy and reconcile before any mutating retry.
- Abort stale streams on account, session, or page changes.
- Never store or log credentials, place them in URLs, or render raw backend errors.
- Render markdown through the existing safe renderer; do not expose unsafe HTML.

## Acceptance Criteria

- Administrator bearer auth is required; the optional key only narrows scope and never gates chat.
- New chat sends the first prompt with `session_id: null` and adopts the returned session.
- Initial and clarification responses branch on durable status before opening SSE.
- Clarification stays on one job, sends exact choice id+label, and omits `option_id` for parameter/free text.
- SSE accepts only `status`/`update`, deduplicates repeated updates, treats terminal/clarification updates as hints, and recovers through durable GETs.
- One coordinated refresh is attempted; second `401` signs out; safe `400`/`403`/`404` and fixed generic `500` copy are used.
- Persisted and job response shapes are read from their correct fields and rendered faithfully with safe fallbacks.
- Claude-focused layout, non-blocking scope panel, free-text clarification, keyboard, responsive, reduced-motion, and live-region behavior work as described.
- Focused Node-only Vitest tests, lint, build, full tests, diff inspection, and available backend smoke checks pass.

## Non-Goals

No token-by-token streaming, cancellation, API-key listing, API-key-only authentication, explicit empty-session creation for New chat, session rename/delete, replay cursors, automatic mutating retries, speculative report interpretation, new dependencies, or backend changes.
