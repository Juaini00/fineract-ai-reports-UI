import { describe, expect, it } from "vitest";
import type { ChatMessage, ChatSession } from "../types";
import {
  CHAT_QUERY_KEYS,
  ambiguousRecoveryCandidates,
  adoptOptimisticMessage,
  chatComposerAvailability,
  chatDraftKey,
  isAmbiguousJobStartFailure,
  jobSessionId,
  matchingAmbiguousMessage,
  removeOptimisticMessage,
  replaceOptimisticMessage,
  selectedSessionIdFor,
  selectedSessionFor,
  useChatStore,
  validPrompt,
} from "./useChat";

const session = (id: string): ChatSession => ({
  id, user_id: "user-1", api_key_id: "key", title: id, status: "active", context_json: {},
  created_at: "2026-01-01", updated_at: "2026-01-01", expires_at: null, archived_at: null,
});

const message = (id: string, sessionId = "session-1"): ChatMessage => ({
  id, session_id: sessionId, job_id: null, role: "user", content: "hello", metadata_json: {}, created_at: "2026-01-01",
});

describe("chat facade helpers", () => {
  it.each([
    ["account initialization", { hasUser: false }, "Preparing your account before sending."],
    ["conversation loading", { sessionsLoading: true }, "Wait for conversations to finish loading before sending."],
    ["current activity", { activeLock: true }, "Wait for the current chat activity to finish before sending."],
    ["job start", { startingJob: true }, "Wait for the current request to start before sending again."],
  ])("disables the composer during %s", (_name, override, reason) => {
    const ready = {
      hasUser: true, sessionsLoading: false, activeLock: false, startingJob: false,
    };
    expect(chatComposerAvailability({ ...ready, ...override })).toEqual({ disabled: true, reason });
  });

  it("enables the composer when bearer auth is ready without an API key", () => {
    expect(chatComposerAvailability({
      hasUser: true, sessionsLoading: false, activeLock: false, startingJob: false,
    })).toEqual({ disabled: false, reason: null });
  });

  it("applies or clears optional scope without discarding drafts", () => {
    const store = useChatStore.getState();
    store.setDraft("user-1:session-1", "keep me");
    store.connectApiKey(" scoped-key ");
    expect(useChatStore.getState()).toMatchObject({ apiKey: "scoped-key", drafts: { "user-1:session-1": "keep me" } });
    useChatStore.getState().connectApiKey("   ");
    expect(useChatStore.getState()).toMatchObject({ apiKey: "", drafts: { "user-1:session-1": "keep me" } });
  });

  it("prioritizes account preparation over later blockers", () => {
    expect(chatComposerAvailability({
      hasUser: false, sessionsLoading: true, activeLock: true, startingJob: true,
    }).reason).toBe("Preparing your account before sending.");
  });

  it("scopes query and draft keys by user and session identity", () => {
    expect(CHAT_QUERY_KEYS.sessions("user-1")).toEqual(["chat", "user-1", "sessions"]);
    expect(CHAT_QUERY_KEYS.messages("user-1", "session-1")).toEqual([
      "chat", "user-1", "sessions", "session-1", "messages",
    ]);
    expect(chatDraftKey("user-1", null)).toBe("user-1:new");
    expect(chatDraftKey("user-1", "session-1")).toBe("user-1:session-1");
    expect(chatDraftKey("user-2", "session-1")).not.toBe(chatDraftKey("user-1", "session-1"));
  });

  it("accepts prompts from 1 through 1000 trimmed characters", () => {
    expect(validPrompt(" x ")).toBe("x");
    expect(validPrompt(` ${"x".repeat(1000)} `)).toBe("x".repeat(1000));
    expect(validPrompt(" \n ")).toBeNull();
    expect(validPrompt("x".repeat(1001))).toBeNull();
  });

  it("starts a new conversation with null and an existing conversation with its id", () => {
    expect(jobSessionId(null)).toBeNull();
    expect(jobSessionId(session("session-1"))).toBe("session-1");
  });

  it("selects only a fetched session in the current scoped list", () => {
    const sessions = [session("session-1")];
    expect(selectedSessionFor(sessions, "session-1")?.id).toBe("session-1");
    expect(selectedSessionFor(sessions, "other-user-session")).toBeNull();
    expect(selectedSessionFor(sessions, "new")).toBeNull();
  });

  it("preserves a requested session until sessions finish loading", () => {
    expect(selectedSessionIdFor([], "deep-link", false)).toBe("deep-link");
  });

  it("falls back after sessions finish loading when the requested session is invalid", () => {
    expect(selectedSessionIdFor([session("session-1")], "invalid", true)).toBe("session-1");
    expect(selectedSessionIdFor([], "invalid", true)).toBe("new");
  });

  it("replaces or removes only the matching optimistic message", () => {
    const messages = [message("optimistic-1"), message("persisted-1")];
    expect(replaceOptimisticMessage(messages, "optimistic-1", "backend-1").map(({ id }) => id))
      .toEqual(["backend-1", "persisted-1"]);
    expect(removeOptimisticMessage(messages, "optimistic-1").map(({ id }) => id)).toEqual(["persisted-1"]);
  });

  it("moves an optimistic message into the backend-created session", () => {
    expect(adoptOptimisticMessage(message("temporary", "new"), "session-2", "persisted", "job-1"))
      .toMatchObject({ id: "persisted", session_id: "session-2", job_id: "job-1" });
  });

  it("bounds ambiguous recovery to newly visible sessions and requires a matching durable job", () => {
    const sessions = Array.from({ length: 12 }, (_, index) => session(`new-${index}`));
    expect(ambiguousRecoveryCandidates(new Set(["old"]), [session("old"), ...sessions]).map(({ id }) => id))
      .toEqual(sessions.slice(0, 10).map(({ id }) => id));
    expect(matchingAmbiguousMessage([
      { ...message("other", "new-1"), content: "other", job_id: "job-other" },
      { ...message("match", "new-1"), content: " hello ", job_id: "job-1" },
    ], "hello")?.job_id).toBe("job-1");
    expect(matchingAmbiguousMessage([{ ...message("no-job"), content: "hello" }], "hello")).toBeNull();
  });

  it("classifies uncertain transport failures without treating explicit rejections as ambiguous", () => {
    expect(isAmbiguousJobStartFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isAmbiguousJobStartFailure(new Error("Chat request failed. Please try again."))).toBe(true);
    expect(isAmbiguousJobStartFailure(new Error("Chat authentication failed."))).toBe(false);
  });
});
