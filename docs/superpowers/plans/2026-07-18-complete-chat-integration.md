# Complete Chat Integration Delta Plan

**Goal:** Bring the existing chat implementation into exact alignment with `doc/task/chat-client-integration.md` and the approved revised design, without changing the established module structure or adding dependencies.

**Architecture:** Keep React Query for sessions/messages, Zustand for small user/session UI state, Axios for JSON, authenticated `fetch` streaming for SSE, and `useChat` as the component facade. Durable job/messages GETs are truth; SSE is a hint.

**Tech stack:** Existing React, TypeScript, Vite, Vitest in its Node environment, React Query, Zustand, Axios, Fetch/ReadableStream, Tailwind, and current UI primitives.

## Global Constraints

- The 510-line `doc/task/chat-client-integration.md` contract and revised design are authoritative.
- Preserve current `src/module/chat/{types,service,hooks,components}` boundaries and existing conventions.
- Require the administrator bearer token. Treat `X-API-Key` as optional narrowing scope; invalid keys are ignored by the backend and chat never gates on a key.
- No new dependencies, browser test environment, unsupported endpoints, backend work, placeholder data, or speculative features.
- Keep assistant content backend-driven. Never expose credentials, SQL, prompt/debug data, stack traces, or raw internal errors.
- Never automatically retry an ambiguously failed mutating request; reconcile durable state first.
- Preserve unrelated dirty changes. Do not commit, push, publish, or modify unrelated files.

## Task 1: Align auth, types, and JSON service

**Files:**
- `src/app/config/axios.ts`
- `src/module/chat/types/index.ts`
- `src/module/chat/service/index.ts`
- Their existing focused test files

**Contract delta:**

- `ChatSession.user_id` and `api_key_id` are nullable.
- Persisted assistant structure is `metadata_json.assistant_response`; job recovery structure is `result_json.structured_response` with `result_json.markdown`.
- Job creation accepts `{ session_id: string | null, message: string }` and returns the creation acknowledgement fields including status/current step.
- `ChatJobResponse` is `{ message: string; option_id?: string }`.
- Validate message length 1-1000, optional `option_id` up to 200, and session title up to 120.

- [ ] Add or update failing Node-only tests for nullable session ownership/scope, the two distinct assistant result locations, nullable job session payload, optional clarification option id, and boundary validation.
- [ ] Add service tests proving bearer is always attached, optional `X-API-Key` is attached only when nonblank, and absence of a key does not reject or suppress a chat call.
- [ ] Test envelope unwrapping and safe status mapping: actionable fixed client copy for `400`, `403`, and `404`; one auth retry path for `401`; always fixed generic copy for HTTP `500` or `internal_error` regardless of backend message.
- [ ] Run the focused tests and confirm they fail for the old mandatory-key/old-shape assumptions.
- [ ] Make the minimum type and service changes. Keep generic coordinated refresh in the existing Axios config: concurrent `401`s share one refresh, each request replays once, and a second `401` clears auth without a loop.
- [ ] Ensure login, refresh, and logout continue using `credentials: "include"`; do not persist a key or token in new chat state.
- [ ] Run the same focused tests until passing.

## Task 2: Correct SSE parser and durable job controller

**Files:**
- `src/module/chat/service/stream.ts`
- `src/module/chat/hooks/useChatJob.ts`
- Their existing focused test files

**Contract delta:** SSE event names are only `status` and `update`. `clarification`, `final`, and `error` are update kinds. Redis may repeat the latest update and does not provide ordered replay.

- [ ] Add failing parser tests for arbitrary UTF-8 chunks, CRLF/LF, multiline `data`, malformed JSON recovery, final buffered data, and ignoring unknown event names.
- [ ] Add transport tests proving bearer auth, conditional optional key header, no credentials in URLs, one coordinated refresh/reopen after `401`, and rejection/sign-out behavior after a second `401`.
- [ ] Add controller tests proving repeated updates are deduplicated by stable `kind`/`step`/`payload`/`at`, while distinct updates still dispatch.
- [ ] Add status-first tests: initial/recovered `queued` or `running` opens SSE; `waiting_for_user_input` restores clarification without SSE; `completed` fetches messages; `failed` reconciles and shows safe copy.
- [ ] Test that clarification/final/error updates trigger durable GET job/messages reconciliation rather than becoming durable transcript state. Test stream close/network/parser failure the same way, reopening only for durable queued/running state.
- [ ] Run the focused tests and confirm the old event-name/replay assumptions fail.
- [ ] Implement the smallest parser/controller delta. Abort stale streams on user/session/page change and keep live rendering idempotent.
- [ ] Run the same focused tests until passing.

## Task 3: Make `useChat` null-session-first and key-optional

**Files:**
- `src/module/chat/hooks/useChat.ts`
- `src/module/chat/hooks/index.ts`
- Existing focused hook tests

**Contract delta:** New chat is a local intent. Its first prompt posts `session_id: null`, then adopts the returned `session_id`; no preliminary blank-session POST is needed. Job creation often returns terminal/waiting because the handler awaits the graph.

- [ ] Add failing pure/controller tests proving sessions and messages load without a key, a valid optional key is forwarded, and key absence never gates entry or send.
- [ ] Test New chat: no request on intent selection, exactly one `POST /chat/jobs` on first valid prompt with `session_id: null`, then adoption of returned session/job/user-message ids.
- [ ] Test existing-session send, 1-1000 trimmed message validation, immediate per-session send locking, and immediate branching on the returned status before SSE.
- [ ] Test query, selection, draft, error, clarification, and active-job isolation by authenticated user/session. Persist only `{ userId, sessionId, jobId }` when recovery requires it.
- [ ] Test an ambiguous job-creation failure: reconcile sessions/messages/accessible durable state, show safe guidance, and never automatically repeat the POST.
- [ ] Run focused tests and confirm old explicit-session and mandatory-key behavior fails.
- [ ] Remove the key gate and preliminary session creation. Compose the existing job controller for returned-status branching and durable recovery.
- [ ] Invalidate/refetch sessions after adopting a new session and messages after terminal reconciliation; replace optimistic content with durable ids/data where available.
- [ ] Run the same focused hook/controller tests until passing.

## Task 4: Align UI, renderer, and clarification

**Files:**
- `src/module/chat/components/ChatWrapper.tsx`
- `src/module/chat/components/SessionList.tsx`
- `src/module/chat/components/ChatList.tsx`
- `src/module/chat/components/ChatComposer.tsx`
- `src/module/chat/components/ClarificationPrompt.tsx`
- `src/module/chat/components/JobProgress.tsx`
- `src/module/chat/components/AssistantResponse.tsx`
- `src/index.css` only if existing styles require adjustment
- Existing focused component tests

**Contract delta:** The optional key belongs in a non-blocking scope panel. Free-text clarification exists even with no options. Persisted rendering prefers `metadata_json.assistant_response`, then markdown `content`; active recovery uses job `result_json`.

- [ ] Add failing pure/server-render tests for a usable chat with no key, optional scope controls that do not block transcript/composer, and no claim that a key authenticates the user.
- [ ] Test renderer precedence separately for persisted messages and job recovery. Cover recognized summary/table/metric/clarification/help/error shapes, ordered returned columns/rows, empty rows, warnings/actions/evidence, malformed structure, and markdown/content/safe fallback.
- [ ] Test clarification choices sending exact `{ option_id: option.id, message: visibleLabel }`; parameter/free-text sends `{ message }` with no `option_id`. Cover free-text-only clarification and limits (message 1-1000, option id at most 200).
- [ ] Test that a clarification `201` is treated as an inserted `ChatMessage`, followed by `GET /chat/jobs/{id}` and status branching; queued/running alone reopens SSE. Preserve clarification after validation/safe failure and reconcile `404`.
- [ ] Run focused tests and confirm old metadata, `others`, and key-gate assumptions fail.
- [ ] Apply the minimum component changes while preserving the approved Claude-focused layout: compact history, reading-first transcript, restrained prompts, calm progress, bounded composer, near-bottom scrolling, and no fabricated result data.
- [ ] Preserve accessibility: named controls, visible focus, semantic tables/headings, keyboard choices, labeled free text, polite status, alert errors, reduced motion, mobile/zoom layout, table overflow, and safe-area composer spacing.
- [ ] Run all component tests, then lint and build.

## Task 5: Full verification and contract audit

**Files:** All files changed in Tasks 1-4; no production files outside the established boundaries unless an existing import requires a minimal adjustment.

- [ ] Run all focused chat/auth tests, then the complete existing Vitest suite in the Node environment.
- [ ] Run the repository lint command and production build.
- [ ] Run `git diff --check` and inspect the diff for only intended files, no credentials/internal fixtures, no unrelated rewrites, and no placeholder text.
- [ ] Search changed code/docs for stale mandatory-key or key-gate language, `metadata_json.structured_response`, invented `rendered_markdown`, special `others` payloads, preliminary New chat session creation, and SSE event names `clarification`/`final`/`error`.
- [ ] Verify contract paths and branches: bearer-required/key-optional headers; null-session first prompt; initial returned-status branching; same-job clarification followed by GET; stable update deduplication; durable recovery after hints/disconnect; one refresh then sign-out; safe `400`/`403`/`404`; fixed generic `500`.
- [ ] Verify renderer and UX: correct persisted/job fields, returned data only, markdown fallback, non-blocking scope panel, free text without options, session/user isolation, keyboard/live-region/reduced-motion/mobile/table behavior.
- [ ] If a backend and credentials are available, smoke-test no-key admin chat, valid-key narrowed scope, null-session prompt, already-terminal and waiting initial responses, same-job choice and free-text clarification, disconnect/reload recovery, and second-401 sign-out. If unavailable, record the smoke test as skipped rather than passed.

## Completion Criteria

The implementation matches the authoritative contract without mandatory-key gating or unsupported capabilities; all status-first, durable recovery, error, rendering, and accessibility behavior above is covered; focused tests, full tests, lint, build, and diff audit pass.
