import { CHAT_ACTIVE_JOB_KEY, CHAT_API_KEY_KEY } from "@/app/config/constants";
import { useAuth } from "@/module/auth/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { create } from "zustand";
import { chatService } from "../service";
import type { ChatJob, ChatJobResponse, ChatMessage, ChatSession } from "../types";
import { useChatJob } from "./useChatJob";

export const CHAT_QUERY_KEYS = {
  sessions: (userId: string) => ["chat", userId, "sessions"] as const,
  messages: (userId: string, sessionId: string) => ["chat", userId, "sessions", sessionId, "messages"] as const,
};

export const chatDraftKey = (userId: string, sessionId: string | null): string =>
  `${userId}:${sessionId ?? "new"}`;

export const validPrompt = (value: string): string | null => {
  const prompt = value.trim();
  return prompt.length >= 1 && prompt.length <= 1000 ? prompt : null;
};

export function chatComposerAvailability({
  hasUser, sessionsLoading, activeLock, startingJob,
}: {
  hasUser: boolean;
  sessionsLoading: boolean;
  activeLock: boolean;
  startingJob: boolean;
}): { disabled: boolean; reason: string | null } {
  const reason = !hasUser ? "Preparing your account before sending."
    : sessionsLoading ? "Wait for conversations to finish loading before sending."
      : activeLock ? "Wait for the current chat activity to finish before sending."
        : startingJob ? "Wait for the current request to start before sending again."
          : null;
  return { disabled: reason !== null, reason };
}

export const selectedSessionFor = (sessions: ChatSession[], sessionId: string | null): ChatSession | null =>
  sessions.find((session) => session.id === sessionId) ?? null;

export const selectedSessionIdFor = (
  sessions: ChatSession[], requestedSessionId: string | null, sessionsLoaded: boolean,
): string => {
  if (requestedSessionId === "new") return "new";
  if (!sessionsLoaded && requestedSessionId) return requestedSessionId;
  return selectedSessionFor(sessions, requestedSessionId)?.id ?? sessions[0]?.id ?? "new";
};

export const replaceOptimisticMessage = (messages: ChatMessage[], temporaryId: string, userMessageId: string): ChatMessage[] =>
  messages.map((message) => message.id === temporaryId ? { ...message, id: userMessageId } : message);

export const removeOptimisticMessage = (messages: ChatMessage[], temporaryId: string): ChatMessage[] =>
  messages.filter((message) => message.id !== temporaryId);

export const jobSessionId = (selectedSession: ChatSession | null): string | null => selectedSession?.id ?? null;

export const adoptOptimisticMessage = (
  message: ChatMessage, sessionId: string, userMessageId: string | undefined, jobId: string,
): ChatMessage => ({ ...message, id: userMessageId ?? message.id, session_id: sessionId, job_id: jobId });

export const ambiguousRecoveryCandidates = (
  previousSessionIds: ReadonlySet<string>, sessions: ChatSession[], limit = 10,
): ChatSession[] => sessions.filter(({ id }) => !previousSessionIds.has(id)).slice(0, limit);

export function matchingAmbiguousMessage(messages: ChatMessage[], prompt: string): ChatMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user" && message.job_id && message.content.trim() === prompt) return message;
  }
  return null;
}

export function isAmbiguousJobStartFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /network|fetch|connection|disconnect|timeout|chat request failed/i.test(message);
}

const session = typeof sessionStorage !== "undefined" && typeof sessionStorage.getItem === "function" &&
  typeof sessionStorage.setItem === "function" && typeof sessionStorage.removeItem === "function" ? sessionStorage : null;

type ChatState = {
  apiKey: string;
  apiKeyInput: string;
  drafts: Record<string, string>;
  errors: Record<string, string | null>;
  isSessionListCollapsed: boolean;
  setApiKeyInput(value: string): void;
  connectApiKey(value: string): void;
  setDraft(key: string, value: string): void;
  setError(key: string, value: string | null): void;
  setSessionListCollapsed(value: boolean): void;
  resetIdentity(): void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  apiKey: session?.getItem(CHAT_API_KEY_KEY) ?? "",
  apiKeyInput: "",
  drafts: {},
  errors: {},
  isSessionListCollapsed: false,
  setApiKeyInput: (apiKeyInput) => set({ apiKeyInput }),
  connectApiKey: (value) => {
    const apiKey = value.trim();
    if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") localStorage.removeItem(CHAT_API_KEY_KEY);
    if (apiKey) session?.setItem(CHAT_API_KEY_KEY, apiKey);
    else session?.removeItem(CHAT_API_KEY_KEY);
    set({ apiKey, apiKeyInput: "" });
  },
  setDraft: (key, value) => set({ drafts: { ...get().drafts, [key]: value } }),
  setError: (key, value) => set({ errors: { ...get().errors, [key]: value } }),
  setSessionListCollapsed: (isSessionListCollapsed) => set({ isSessionListCollapsed }),
  resetIdentity: () => {
    session?.removeItem(CHAT_API_KEY_KEY);
    set({ apiKey: "", apiKeyInput: "", drafts: {}, errors: {} });
  },
}));

function optimisticMessage(userId: string, sessionId: string, content: string): ChatMessage {
  return {
    id: `optimistic:${userId}:${sessionId}:${encodeURIComponent(content)}`,
    session_id: sessionId,
    job_id: null,
    role: "user",
    content,
    metadata_json: {},
    created_at: new Date().toISOString(),
  };
}

function activeIdentity(): { userId: string; sessionId: string; jobId: string } | null {
  if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") return null;
  try {
    const value = JSON.parse(localStorage.getItem(CHAT_ACTIVE_JOB_KEY) ?? "null") as Record<string, unknown> | null;
    return value && typeof value.userId === "string" && typeof value.sessionId === "string" && typeof value.jobId === "string"
      ? value as { userId: string; sessionId: string; jobId: string }
      : null;
  } catch {
    return null;
  }
}

const safeError = (error: unknown): string =>
  error instanceof Error && /authentication|required|not found/i.test(error.message)
    ? error.message
    : "We could not complete that chat action. Please try again.";

export function useChat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSessionId = searchParams.get("session");
  const previousUserId = useRef(userId);
  const pendingAdoptedJob = useRef<ChatJob | null>(null);
  const {
    apiKey, apiKeyInput, drafts, errors, isSessionListCollapsed,
    setApiKeyInput, connectApiKey, setDraft, setError, setSessionListCollapsed, resetIdentity,
  } = useChatStore();
  const previousApiKey = useRef(apiKey);

  const sessionsQuery = useQuery({
    queryKey: CHAT_QUERY_KEYS.sessions(userId),
    queryFn: () => chatService.ListSessions(apiKey),
    enabled: Boolean(userId),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const selectedId = selectedSessionIdFor(sessions, requestedSessionId, sessionsQuery.isFetched);
  const selectedSession = selectedSessionFor(sessions, selectedId);
  const draftIdentity = chatDraftKey(userId, selectedSession?.id ?? null);
  const input = drafts[draftIdentity] ?? "";

  const messagesQuery = useQuery({
    queryKey: CHAT_QUERY_KEYS.messages(userId, selectedSession?.id ?? "new"),
    queryFn: () => chatService.ListMessages(apiKey, selectedSession!.id),
    enabled: Boolean(userId && selectedSession),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const messages = messagesQuery.data ?? [];

  const reconcile = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    if (!userId || !sessionId) return [];
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.sessions(userId) }),
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(userId, sessionId) }),
    ]);
    return queryClient.fetchQuery({
      queryKey: CHAT_QUERY_KEYS.messages(userId, sessionId),
      queryFn: () => chatService.ListMessages(apiKey, sessionId),
    });
  }, [apiKey, queryClient, userId]);
  const jobController = useChatJob({ apiKey, userId, sessionId: selectedSession?.id ?? null, reconcile });

  const startJobMutation = useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string | null; message: string }) =>
      chatService.StartJob(apiKey, sessionId, message),
  });

  const adoptStartedJob = useCallback(async (job: ChatJob, temporary: ChatMessage, sessionData?: ChatSession) => {
    const adoptedSession = sessionData ?? await chatService.GetSession(apiKey, job.session_id);
    const adoptedMessage = adoptOptimisticMessage(temporary, job.session_id, job.user_message_id, job.job_id);
    queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, "new"), (current = []) =>
      removeOptimisticMessage(current, temporary.id));
    queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, job.session_id), (current = []) =>
      current.some(({ id }) => id === adoptedMessage.id) ? current : [...current, adoptedMessage]);
    queryClient.setQueryData<ChatSession[]>(CHAT_QUERY_KEYS.sessions(userId), (current = []) =>
      [adoptedSession, ...current.filter(({ id }) => id !== adoptedSession.id)]);
    pendingAdoptedJob.current = job;
    setDraft(chatDraftKey(userId, null), "");
    setError(chatDraftKey(userId, null), null);
    setSearchParams({ session: job.session_id });
  }, [apiKey, queryClient, setDraft, setError, setSearchParams, userId]);

  const recoverAmbiguousFirstSend = useCallback(async (
    previousSessionIds: ReadonlySet<string>, temporary: ChatMessage, message: string,
  ): Promise<boolean> => {
    const refreshed = await chatService.ListSessions(apiKey);
    queryClient.setQueryData(CHAT_QUERY_KEYS.sessions(userId), refreshed);
    for (const candidate of ambiguousRecoveryCandidates(previousSessionIds, refreshed)) {
      const durableMessages = await chatService.ListMessages(apiKey, candidate.id);
      const matched = matchingAmbiguousMessage(durableMessages, message);
      if (!matched?.job_id) continue;
      queryClient.setQueryData(CHAT_QUERY_KEYS.messages(userId, candidate.id), durableMessages);
      const job = await chatService.GetJob(apiKey, matched.job_id);
      await adoptStartedJob(job, temporary, candidate);
      return true;
    }
    return false;
  }, [adoptStartedJob, apiKey, queryClient, userId]);
  const startJob = useCallback(async (sessionId: string, message: string, temporaryId: string) => {
    try {
      const job = await startJobMutation.mutateAsync({ sessionId, message });
      if (job.user_message_id) {
        queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, sessionId), (current = []) =>
          replaceOptimisticMessage(current, temporaryId, job.user_message_id!),
        );
      }
      setDraft(chatDraftKey(userId, sessionId), "");
      setError(chatDraftKey(userId, sessionId), null);
      await jobController.start(job);
    } catch (error) {
      const key = chatDraftKey(userId, sessionId);
      if (isAmbiguousJobStartFailure(error)) {
        setError(key, "The send result is uncertain. Refresh this conversation before sending again.");
        await reconcile(sessionId);
      } else {
        queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, sessionId), (current = []) =>
          removeOptimisticMessage(current, temporaryId),
        );
        setError(key, safeError(error));
      }
    }
  }, [jobController, queryClient, reconcile, setDraft, setError, startJobMutation, userId]);

  useEffect(() => {
    const pending = pendingAdoptedJob.current;
    if (!pending || selectedSession?.id !== pending.session_id) return;
    pendingAdoptedJob.current = null;
    void jobController.start(pending);
  }, [jobController, selectedSession?.id]);

  useEffect(() => {
    if (requestedSessionId === selectedId) return;
    setSearchParams({ session: selectedId }, { replace: true });
  }, [requestedSessionId, selectedId, setSearchParams]);

  useEffect(() => {
    const previous = previousUserId.current;
    if (previous && previous !== userId) {
      queryClient.removeQueries({ queryKey: ["chat", previous] });
      if (typeof localStorage !== "undefined") localStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
      resetIdentity();
    }
    previousUserId.current = userId;
  }, [queryClient, resetIdentity, userId]);

  useEffect(() => {
    if (previousApiKey.current === apiKey) return;
    previousApiKey.current = apiKey;
    if (userId) void queryClient.resetQueries({ queryKey: ["chat", userId] });
  }, [apiKey, queryClient, userId]);

  const lock = activeIdentity();
  const hasActiveLock = Boolean(lock && lock.userId === userId) || jobController.isSendLocked;
  const composerAvailability = chatComposerAvailability({
    hasUser: Boolean(userId),
    sessionsLoading: sessionsQuery.isLoading,
    activeLock: hasActiveLock,
    startingJob: startJobMutation.isPending,
  });
  const isSending = composerAvailability.disabled;
  const sendDisabledReason = composerAvailability.reason;

  const sendMessage = async () => {
    if (composerAvailability.disabled) {
      setError(draftIdentity, composerAvailability.reason);
      return;
    }
    const message = validPrompt(input);
    if (!message) {
      setError(draftIdentity, input.trim() ? "Message must be between 1 and 1000 characters." : "Enter a message before sending.");
      return;
    }

    if (!selectedSession) {
      const temporary = optimisticMessage(userId, "new", message);
      const previousSessionIds = new Set(sessions.map(({ id }) => id));
      let startedJob: ChatJob | null = null;
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, "new"), (current = []) => [...current, temporary]);
      try {
        startedJob = await startJobMutation.mutateAsync({ sessionId: null, message });
        await adoptStartedJob(startedJob, temporary);
      } catch (error) {
        if (startedJob || isAmbiguousJobStartFailure(error)) {
          const recovered = await recoverAmbiguousFirstSend(previousSessionIds, temporary, message).catch(() => false);
          if (!recovered) setError(draftIdentity, "The send result is uncertain. Refresh conversations before deliberately sending again.");
        } else {
          queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, "new"), (current = []) =>
            removeOptimisticMessage(current, temporary.id));
          setError(draftIdentity, safeError(error));
        }
      }
      return;
    }

    const temporary = optimisticMessage(userId, selectedSession.id, message);
    queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(userId, selectedSession.id), (current = []) => [...current, temporary]);
    await startJob(selectedSession.id, message, temporary.id);
  };

  return {
    apiKey,
    apiKeyInput,
    sessions,
    selectedId,
    selectedSession,
    messages,
    input,
    isSessionListCollapsed,
    isLoadingSessions: sessionsQuery.isLoading,
    sessionsError: sessionsQuery.error ? safeError(sessionsQuery.error) : null,
    isLoadingMessages: messagesQuery.isLoading,
    isSending,
    sendDisabledReason,
    statusText: selectedSession ? jobController.statusLabel || null : null,
    error: errors[draftIdentity] || jobController.error || (sessionsQuery.error || messagesQuery.error ? safeError(sessionsQuery.error || messagesQuery.error) : null),
    clarificationOptions: selectedSession ? jobController.clarificationOptions : [],
    clarificationMessage: selectedSession ? jobController.clarificationMessage : "",
    isClarificationActive: Boolean(selectedSession && jobController.job?.status === "waiting_for_user_input"),
    isAnswering: jobController.isAnswering,
    setApiKeyInput,
    saveApiKey: () => connectApiKey(apiKeyInput),
    clearApiKey: () => connectApiKey(""),
    setInput: (value: string) => setDraft(draftIdentity, value),
    setSessionListCollapsed,
    selectSession: (sessionId: string) => setSearchParams({ session: sessionId }),
    createSession: () => setSearchParams({ session: "new" }),
    sendMessage,
    answerClarification: (payload: ChatJobResponse) => void jobController.answer(payload),
  };
}
