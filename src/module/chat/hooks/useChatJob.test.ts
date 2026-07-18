import { describe, expect, it, vi } from "vitest";
import { CHAT_ACTIVE_JOB_KEY } from "../../../app/config/constants";
import type { ChatJob, ChatJobStatus } from "../types";
import {
  createChatJobController,
  jobStepLabel,
  parseActiveJob,
  recoveryAction,
  safeChatError,
  serializeActiveJob,
} from "./useChatJob";

const job = (status: ChatJobStatus, extra: Partial<ChatJob> = {}): ChatJob => ({
  job_id: "job-1", session_id: "session-1", status, current_step: "queued", ...extra,
});

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function setup(overrides: Record<string, unknown> = {}) {
  const store = storage();
  const dependencies = {
    apiKey: "key", userId: "user-1", sessionId: "session-1", storage: store,
    getJob: vi.fn(async () => job("running")),
    respondToJob: vi.fn(async () => ({ id: "message-1" })),
    streamJob: vi.fn(() => new Promise<void>(() => {})),
    reconcile: vi.fn(async () => {}),
    ...overrides,
  };
  return { controller: createChatJobController(dependencies as never), dependencies, store };
}

describe("pure job helpers", () => {
  it.each([
    ["queued", "stream"], ["running", "stream"], ["waiting_for_user_input", "clarification"],
    ["completed", "reconcile"], ["failed", "reconcile"], ["expired", "reconcile"], ["cancelled", "reconcile"],
  ] as const)("maps %s status first", (status, expected) => expect(recoveryAction(status)).toBe(expected));

  it("isolates the exact persisted identity", () => {
    const identity = { userId: "user-1", sessionId: "session-1", jobId: "job-1" };
    expect(serializeActiveJob(identity)).toBe('{"userId":"user-1","sessionId":"session-1","jobId":"job-1"}');
    expect(parseActiveJob(serializeActiveJob(identity), "user-1", "session-1")).toEqual(identity);
    expect(parseActiveJob("bad", "user-1", "session-1")).toBeNull();
    expect(parseActiveJob(serializeActiveJob(identity), "other", "session-1")).toBeNull();
    expect(parseActiveJob(serializeActiveJob(identity), "user-1", "other")).toBeNull();
  });

  it("uses approved labels and safe English errors", () => {
    expect(["queued", "checking_context", "embedding", "taking_decision", "authorizing", "executing_query", "shaping_result", "formatting_response", "response"].map(jobStepLabel)).toEqual([
      "Queued", "Checking conversation context", "Finding relevant reporting knowledge", "Choosing the right report or asking a question", "Checking permissions", "Running the approved report query", "Shaping report data", "Preparing the answer", "Finalizing response",
    ]);
    expect(jobStepLabel("private_step")).toBe("Working on your request");
    expect(safeChatError(new Error("SQL token raw body"))).toBe("Chat connection was interrupted. Please try again.");
    expect(safeChatError({ status: 400, message: "raw" })).toBe("Please correct your chat request and try again.");
    expect(safeChatError({ status: 403, message: "raw" })).toBe("Administrator access is required to use chat.");
    expect(safeChatError({ status: 404, message: "raw" })).toBe("This chat resource is no longer available.");
    expect(safeChatError({ status: 500, message: "raw" })).toBe("Chat request failed. Please try again.");
    expect(safeChatError(null, "failed")).toBe("The request could not be completed. Please try again.");
    expect(safeChatError(null, "expired")).toBe("This request expired. Please send it again.");
    expect(safeChatError(null, "cancelled")).toBe("This request was cancelled. Please try again.");
  });
});

describe("chat job controller", () => {
  it.each(["queued", "running"] as const)("starts %s jobs by persisting and streaming", async (status) => {
    const { controller, dependencies, store } = setup();
    await controller.start(job(status));
    expect(dependencies.streamJob).toHaveBeenCalledTimes(1);
    expect(CHAT_ACTIVE_JOB_KEY).toBe("chat-active-job");
    expect(store.getItem(CHAT_ACTIVE_JOB_KEY)).toContain("job-1");
    expect(controller.getSnapshot().isSendLocked).toBe(true);
  });

  it("uses durable result clarification before persisted assistant metadata", async () => {
    const reconcile = vi.fn(async () => [{
      id: "m1", session_id: "session-1", job_id: "job-1", role: "assistant", content: "",
      metadata_json: { assistant_response: { message: "fallback", options: ["B"] } }, created_at: "2026-01-01",
    }]);
    const { controller, dependencies } = setup({ reconcile });
    await controller.start(job("waiting_for_user_input", { result_json: { structured_response: { message: "Choose", options: [{ id: "one", label: "One" }] } } }));
    expect(dependencies.streamJob).not.toHaveBeenCalled();
    expect(controller.getSnapshot().clarificationOptions).toEqual([{ id: "one", label: "One" }]);
    expect(controller.getSnapshot().clarificationMessage).toBe("Choose");
    expect(controller.getSnapshot().job?.job_id).toBe("job-1");
  });

  it("falls back to the latest persisted assistant clarification", async () => {
    const reconcile = vi.fn(async () => [
      { id: "m1", session_id: "session-1", job_id: "job-1", role: "assistant", content: "", metadata_json: { assistant_response: { message: "Old", options: ["A"] } }, created_at: "1" },
      { id: "m2", session_id: "session-1", job_id: "job-1", role: "assistant", content: "", metadata_json: { assistant_response: { message: "Latest", options: ["B"] } }, created_at: "2" },
    ]);
    const { controller } = setup({ reconcile });
    await controller.start(job("waiting_for_user_input"));
    expect(controller.getSnapshot()).toMatchObject({ clarificationMessage: "Latest", clarificationOptions: ["B"] });
  });

  it("reconciles terminal starts before clearing persistence", async () => {
    const store = storage();
    const reconcile = vi.fn(async () => expect(store.getItem(CHAT_ACTIVE_JOB_KEY)).not.toBeNull());
    const { controller } = setup({ storage: store, reconcile });
    await controller.start(job("completed"));
    expect(reconcile).toHaveBeenCalledWith("session-1");
    expect(store.getItem(CHAT_ACTIVE_JOB_KEY)).toBeNull();
    expect(controller.getSnapshot().isSendLocked).toBe(false);
  });

  it("recovers with GET before branching and restores clarification", async () => {
    const store = storage();
    store.setItem(CHAT_ACTIVE_JOB_KEY, serializeActiveJob({ userId: "user-1", sessionId: "session-1", jobId: "job-1" }));
    const getJob = vi.fn(async () => job("waiting_for_user_input", { result_json: { structured_response: { options: ["A"] } } }));
    const { controller, dependencies } = setup({ storage: store, getJob });
    await controller.recover();
    expect(getJob).toHaveBeenCalledWith("key", "job-1");
    expect(dependencies.streamJob).not.toHaveBeenCalled();
    expect(controller.getSnapshot().clarificationOptions).toEqual(["A"]);
  });

  it("answers then GETs the same durable job before reopening stream", async () => {
    const getJob = vi.fn(async () => job("running"));
    const { controller, dependencies } = setup({ getJob });
    await controller.start(job("waiting_for_user_input", { state_json: { options: ["A"] } }));
    await controller.answer({ option_id: "one", message: "One" });
    expect(dependencies.respondToJob).toHaveBeenCalledWith("key", "job-1", { option_id: "one", message: "One" });
    expect(getJob).toHaveBeenCalledWith("key", "job-1");
    expect(dependencies.streamJob).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().clarificationOptions).toEqual([]);
  });

  it.each([
    { status: "waiting_for_user_input" },
    { payload: { status: "waiting_for_user_input" } },
  ])("stops streaming and inspects durable state for a waiting status snapshot", async (update) => {
    let handler!: (event: string, data: unknown) => void;
    const streamJob = vi.fn((_key, _id, callback) => { handler = callback; return new Promise<void>(() => {}); });
    const getJob = vi.fn(async () => job("waiting_for_user_input", { result_json: { structured_response: { options: ["A"] } } }));
    const { controller } = setup({ streamJob, getJob });
    await controller.start(job("running"));
    handler("status", update);
    await vi.waitFor(() => expect(controller.getSnapshot().clarificationOptions).toEqual(["A"]));
    expect(getJob).toHaveBeenCalledTimes(1);
    expect(streamJob).toHaveBeenCalledTimes(1);
  });

  it("treats a clarification event as a hint and GETs durable state", async () => {
    let handler!: (event: string, data: unknown) => void;
    let streamSignal!: AbortSignal;
    const streamJob = vi.fn((_key, _id, callback, signal: AbortSignal) => {
      handler = callback;
      streamSignal = signal;
      return new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
    });
    const getJob = vi.fn(async () => job("waiting_for_user_input", { result_json: { structured_response: { message: "Durable", options: ["B"] } } }));
    const { controller, dependencies } = setup({ streamJob, getJob });
    await controller.start(job("running"));
    handler("update", { kind: "clarification", payload: { options: ["A"] } });
    await vi.waitFor(() => expect(streamSignal.aborted).toBe(true));
    expect(controller.getSnapshot()).toMatchObject({ job: { status: "waiting_for_user_input" }, clarificationOptions: ["B"], clarificationMessage: "Durable" });
    expect(dependencies.getJob).toHaveBeenCalledOnce();
    expect(streamJob).toHaveBeenCalledTimes(1);
  });

  it("deduplicates equivalent update events with stable recursive serialization", async () => {
    let handler!: (event: "status" | "update", data: unknown) => void;
    const streamJob = vi.fn((_key, _id, callback) => { handler = callback; return new Promise<void>(() => {}); });
    const { controller } = setup({ streamJob });
    const listener = vi.fn();
    controller.subscribe(listener);
    await controller.start(job("running"));
    listener.mockClear();
    handler("update", { kind: "status", step: "embedding", payload: { b: 2, a: { y: 2, x: 1 } }, at: "1" });
    handler("update", { at: "1", payload: { a: { x: 1, y: 2 }, b: 2 }, step: "embedding", kind: "status" });
    expect(listener).toHaveBeenCalledTimes(1);
    handler("update", { kind: "status", step: "embedding", payload: { b: 2 }, at: "2" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores controller callbacks with unknown event names", async () => {
    let handler!: (event: string, data: unknown) => void;
    const streamJob = vi.fn((_key, _id, callback) => { handler = callback; return new Promise<void>(() => {}); });
    const { controller, dependencies } = setup({ streamJob });
    await controller.start(job("running"));
    handler("final", { kind: "final" });
    await Promise.resolve();
    expect(dependencies.getJob).not.toHaveBeenCalled();
  });

  it.each([{ status: 404 }, { status: 500 }, new Error("network")])("reconciles after a non-validation answer failure without retrying the POST", async (error) => {
    const respondToJob = vi.fn().mockRejectedValue(error);
    const getJob = vi.fn(async () => job("waiting_for_user_input", { result_json: { structured_response: { options: ["A"] } } }));
    const reconcile = vi.fn(async () => []);
    const { controller } = setup({ respondToJob, getJob, reconcile });
    await controller.start(job("waiting_for_user_input"));
    reconcile.mockClear();
    await controller.answer({ message: "A" });
    expect(respondToJob).toHaveBeenCalledOnce();
    expect(getJob).toHaveBeenCalledOnce();
    expect(reconcile).toHaveBeenCalledWith("session-1");
  });

  it("keeps durable clarification and does not reconcile a validation failure", async () => {
    const respondToJob = vi.fn().mockRejectedValue({ status: 400, message: "raw validation detail" });
    const reconcile = vi.fn(async () => []);
    const { controller, dependencies } = setup({ respondToJob, reconcile });
    await controller.start(job("waiting_for_user_input", { result_json: { structured_response: { message: "Choose", options: ["A"] } } }));
    await controller.answer({ message: "bad" });
    expect(dependencies.getJob).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ clarificationMessage: "Choose", clarificationOptions: ["A"], isSendLocked: true, isAnswering: false, error: "Please correct your chat request and try again." });
  });

  it("guards duplicate clarification answers while one is pending", async () => {
    let finish!: () => void;
    const respondToJob = vi.fn(() => new Promise<never>((resolve) => { finish = resolve as () => void; }));
    const { controller } = setup({ respondToJob });
    await controller.start(job("waiting_for_user_input", { state_json: { options: [{ id: "one" }] } }));
    const first = controller.answer({ option_id: "one", message: "One" });
    const second = controller.answer({ option_id: "one", message: "One" });
    expect(controller.getSnapshot().isAnswering).toBe(true);
    expect(respondToJob).toHaveBeenCalledTimes(1);
    finish();
    await first;
    await second;
    expect(controller.getSnapshot().isAnswering).toBe(false);
  });

  it("GETs durable status after disconnect and reopens only an active job", async () => {
    const streamJob = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementation(() => new Promise<void>(() => {}));
    const getJob = vi.fn(async () => job("running"));
    const { controller } = setup({ streamJob, getJob });
    await controller.start(job("running"));
    await vi.waitFor(() => expect(streamJob).toHaveBeenCalledTimes(2));
    expect(getJob).toHaveBeenCalledWith("key", "job-1");
  });

  it("treats stream terminal and disconnect as provisional durable GETs", async () => {
    let handler!: (event: string, data: unknown) => void;
    const streamJob = vi.fn((_key, _id, callback) => { handler = callback; return new Promise<void>(() => {}); });
    const getJob = vi.fn(async () => job("completed"));
    const reconcile = vi.fn(async () => {});
    const { controller, store } = setup({ streamJob, getJob, reconcile });
    await controller.start(job("running"));
    handler("update", { kind: "final" });
    await vi.waitFor(() => expect(reconcile).toHaveBeenCalled());
    expect(getJob).toHaveBeenCalled();
    expect(store.getItem(CHAT_ACTIVE_JOB_KEY)).toBeNull();
  });

  it("does not notify or recover after dispose", async () => {
    let finish!: () => void;
    const streamJob = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { controller, dependencies } = setup({ streamJob });
    const listener = vi.fn();
    controller.subscribe(listener);
    void controller.start(job("running"));
    await vi.waitFor(() => expect(streamJob).toHaveBeenCalled());
    controller.dispose();
    finish();
    await Promise.resolve();
    expect(dependencies.getJob).not.toHaveBeenCalled();
    const calls = listener.mock.calls.length;
    await controller.recover();
    expect(listener).toHaveBeenCalledTimes(calls);
  });
});
