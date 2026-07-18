import { useEffect, useMemo, useSyncExternalStore } from "react";
import { CHAT_ACTIVE_JOB_KEY } from "../../../app/config/constants";
import { chatService } from "../service";
import { streamChatJob } from "../service/stream";
import {
  isTerminalJobStatus,
  normalizeClarificationOptions,
  type ActiveJobIdentity,
  type ChatJob,
  type ChatJobResponse,
  type ChatJobStatus,
  type ChatMessage,
  type ChatStreamHandler,
  type ClarificationOption,
  type UseChatJobResult,
} from "../types";

export type JobRecoveryAction = "stream" | "clarification" | "reconcile";

export const recoveryAction = (status: ChatJobStatus): JobRecoveryAction =>
  status === "queued" || status === "running"
    ? "stream"
    : status === "waiting_for_user_input" ? "clarification" : "reconcile";

export const serializeActiveJob = (identity: ActiveJobIdentity): string => JSON.stringify(identity);

export function parseActiveJob(value: string | null, userId: string, sessionId: string): ActiveJobIdentity | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const valid = parsed && typeof parsed === "object" &&
      typeof parsed.userId === "string" && typeof parsed.sessionId === "string" && typeof parsed.jobId === "string" &&
      Object.keys(parsed).length === 3 && parsed.userId === userId && parsed.sessionId === sessionId;
    return valid ? parsed as ActiveJobIdentity : null;
  } catch {
    return null;
  }
}

const labels: Record<string, string> = {
  queued: "Queued",
  checking_context: "Checking conversation context",
  embedding: "Finding relevant reporting knowledge",
  taking_decision: "Choosing the right report or asking a question",
  authorizing: "Checking permissions",
  executing_query: "Running the approved report query",
  shaping_result: "Shaping report data",
  formatting_response: "Preparing the answer",
  response: "Finalizing response",
};

export const jobStepLabel = (step?: string): string => labels[step ?? ""] ?? "Working on your request";

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === "number") return candidate.status;
  return typeof candidate.response?.status === "number" ? candidate.response.status : undefined;
}

export function safeChatError(error: unknown, status?: ChatJobStatus): string {
  if (status === "failed") return "The request could not be completed. Please try again.";
  if (status === "expired") return "This request expired. Please send it again.";
  if (status === "cancelled") return "This request was cancelled. Please try again.";
  if (errorStatus(error) === 400) return "Please correct your chat request and try again.";
  if (errorStatus(error) === 403) return "Administrator access is required to use chat.";
  if (errorStatus(error) === 404) return "This chat resource is no longer available.";
  if (errorStatus(error) === 500) return "Chat request failed. Please try again.";
  return "Chat connection was interrupted. Please try again.";
}

export interface ChatJobControllerDependencies {
  apiKey: string;
  userId: string;
  sessionId: string;
  getJob: (apiKey: string, jobId: string) => Promise<ChatJob>;
  respondToJob: (apiKey: string, jobId: string, payload: ChatJobResponse) => Promise<ChatMessage>;
  streamJob: (apiKey: string, jobId: string, handler: ChatStreamHandler, signal: AbortSignal) => Promise<void>;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  reconcile: (sessionId: string) => Promise<ChatMessage[] | void>;
}

export interface ChatJobController {
  getSnapshot(): UseChatJobResult;
  subscribe(listener: () => void): () => void;
  start: UseChatJobResult["start"];
  answer: UseChatJobResult["answer"];
  recover: UseChatJobResult["recover"];
  clear: UseChatJobResult["clear"];
  dispose(): void;
}

function clarification(value: unknown): { message: string; options: ClarificationOption[] } | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  const options = normalizeClarificationOptions(response.options);
  const message = typeof response.message === "string" ? response.message : "";
  return options.length || message ? { message, options } : null;
}

function persistedClarification(messages: ChatMessage[] | void) {
  if (!messages) return null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const found = clarification(message.metadata_json?.assistant_response);
    if (found) return found;
  }
  return null;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createChatJobController(dependencies: ChatJobControllerDependencies): ChatJobController {
  const listeners = new Set<() => void>();
  let disposed = false;
  let streamJobId: string | null = null;
  let recovery: Promise<void> | null = null;
  let abortController: AbortController | null = null;
  let updateJobId: string | null = null;
  const seenUpdates = new Set<string>();
  let snapshot: UseChatJobResult;

  const emit = (next: Partial<UseChatJobResult>) => {
    if (disposed) return;
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };
  const persist = (jobId: string) => dependencies.storage.setItem(CHAT_ACTIVE_JOB_KEY, serializeActiveJob({
    userId: dependencies.userId, sessionId: dependencies.sessionId, jobId,
  }));
  const clear = () => {
    abortController?.abort();
    abortController = null;
    streamJobId = null;
    dependencies.storage.removeItem(CHAT_ACTIVE_JOB_KEY);
    seenUpdates.clear();
    updateJobId = null;
    emit({ job: null, clarificationOptions: [], clarificationMessage: "", error: null, statusLabel: "", isSendLocked: false, isAnswering: false });
  };
  const reconcileTerminal = async (job: ChatJob) => {
    abortController?.abort();
    await dependencies.reconcile(dependencies.sessionId);
    if (disposed) return;
    dependencies.storage.removeItem(CHAT_ACTIVE_JOB_KEY);
    streamJobId = null;
    emit({ job, clarificationOptions: [], clarificationMessage: "", error: job.status === "completed" ? null : safeChatError(job.error_json, job.status), isSendLocked: false });
  };
  const inspect = (jobId: string): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (recovery) return recovery;
    recovery = dependencies.getJob(dependencies.apiKey, jobId)
      .then((durable) => branch(durable))
      .catch((error) => emit({ error: safeChatError(error), isSendLocked: true }))
      .finally(() => { recovery = null; });
    return recovery;
  };
  const openStream = (job: ChatJob) => {
    if (disposed || streamJobId === job.job_id) return;
    streamJobId = job.job_id;
    abortController = new AbortController();
    const signal = abortController.signal;
    const handler: ChatStreamHandler = (event, data) => {
      if (disposed || signal.aborted || !data || typeof data !== "object") return;
      if (event !== "status" && event !== "update") return;
      const update = data as { kind?: string; step?: string; at?: string; status?: ChatJobStatus; current_step?: string; payload?: { status?: ChatJobStatus } };
      if (event === "update") {
        if (updateJobId !== job.job_id) { seenUpdates.clear(); updateJobId = job.job_id; }
        const key = stableSerialize({ kind: update.kind, step: update.step, payload: update.payload, at: update.at });
        if (seenUpdates.has(key)) return;
        seenUpdates.add(key);
      }
      const step = update.current_step ?? update.step;
      if (step) emit({ statusLabel: jobStepLabel(step) });
      if (update.kind === "clarification") {
        abortController?.abort();
        streamJobId = null;
        void inspect(job.job_id);
        return;
      }
      if (update.status === "waiting_for_user_input" || update.payload?.status === "waiting_for_user_input") {
        abortController?.abort();
        streamJobId = null;
        void inspect(job.job_id);
        return;
      }
      if (update.kind === "final" || update.kind === "error" || isTerminalJobStatus(update.status) || isTerminalJobStatus(update.payload?.status)) {
        void inspect(job.job_id);
      }
    };
    void dependencies.streamJob(dependencies.apiKey, job.job_id, handler, signal)
      .catch((error) => { if (!signal.aborted && !disposed) emit({ error: safeChatError(error) }); })
      .finally(() => {
        if (disposed || signal.aborted || streamJobId !== job.job_id) return;
        streamJobId = null;
        void inspect(job.job_id);
      });
  };
  const branch = async (job: ChatJob): Promise<void> => {
    if (disposed) return;
    persist(job.job_id);
    emit({ job, statusLabel: jobStepLabel(job.current_step), error: null, isSendLocked: true });
    const action = recoveryAction(job.status);
    if (action === "stream") {
      emit({ clarificationOptions: [], clarificationMessage: "" });
      openStream(job);
    }
    else if (action === "clarification") {
      abortController?.abort();
      streamJobId = null;
      const durable = clarification(job.result_json?.structured_response);
      const messages = durable ? undefined : await dependencies.reconcile(dependencies.sessionId);
      const prompt = durable ?? persistedClarification(messages);
      emit({ clarificationOptions: prompt?.options ?? [], clarificationMessage: prompt?.message ?? "" });
    } else await reconcileTerminal(job);
  };
  const start = async (job: ChatJob) => branch(job);
  const answer = async (payload: ChatJobResponse) => {
    const current = snapshot.job;
    if (!current || disposed || snapshot.isAnswering) return;
    emit({ isAnswering: true });
    try {
      await dependencies.respondToJob(dependencies.apiKey, current.job_id, payload);
      await inspect(current.job_id);
    } catch (error) {
      emit({ error: safeChatError(error), isSendLocked: true });
      const status = errorStatus(error);
      if (status !== 400) {
        await dependencies.reconcile(dependencies.sessionId).catch(() => undefined);
        await inspect(current.job_id);
      }
    } finally {
      emit({ isAnswering: false });
    }
  };
  const recover = async () => {
    if (disposed) return;
    const identity = parseActiveJob(dependencies.storage.getItem(CHAT_ACTIVE_JOB_KEY), dependencies.userId, dependencies.sessionId);
    if (identity) await inspect(identity.jobId);
  };
  snapshot = { job: null, clarificationOptions: [], clarificationMessage: "", error: null, statusLabel: "", isSendLocked: false, isAnswering: false, start, answer, recover, clear };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { if (disposed) return () => {}; listeners.add(listener); return () => listeners.delete(listener); },
    start, answer, recover, clear,
    dispose() { disposed = true; abortController?.abort(); listeners.clear(); },
  };
}

const unavailableStorage: ChatJobControllerDependencies["storage"] = {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
};

export function useChatJob(options: {
  apiKey: string;
  userId: string;
  sessionId: string | null;
  reconcile: (sessionId: string) => Promise<ChatMessage[]>;
}): UseChatJobResult {
  const controller = useMemo(() => createChatJobController({
    apiKey: options.apiKey,
    userId: options.userId,
    sessionId: options.sessionId ?? "",
    getJob: chatService.GetJob,
    respondToJob: chatService.RespondToJob,
    streamJob: streamChatJob,
    storage: typeof localStorage === "undefined" ? unavailableStorage : localStorage,
    reconcile: options.reconcile,
  }), [options.apiKey, options.userId, options.sessionId, options.reconcile]);
  useEffect(() => {
    if (options.sessionId) void controller.recover();
    return () => controller.dispose();
  }, [controller, options.sessionId]);
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}
