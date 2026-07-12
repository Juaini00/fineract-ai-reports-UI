import { CHAT_ACTIVE_JOB_KEY, CHAT_API_KEY_KEY } from "@/app/config/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { create } from "zustand";
import { chatService, streamChatJob } from "../service";
import type { ChatJob, ChatMessage, ChatSession, ChatStreamUpdate, ClarificationOption } from "../types";

const activeStatuses = new Set(["queued", "running", "waiting_for_user_input"]);
const finishedStatuses = new Set(["completed", "failed", "expired", "cancelled"]);

export const CHAT_QUERY_KEYS = {
  sessions: (apiKey: string) => ["chat", "sessions", apiKey] as const,
  messages: (apiKey: string, sessionId: string) => ["chat", "messages", apiKey, sessionId] as const,
};

type ActiveJobCache = { jobId: string; sessionId: string };

type ChatState = {
  apiKey: string;
  apiKeyInput: string;
  input: string;
  isSessionListCollapsed: boolean;
  activeJob: ChatJob | null;
  statusText: string | null;
  clarificationOptions: ClarificationOption[];
  error: string | null;
  setApiKeyInput: (apiKeyInput: string) => void;
  saveApiKey: () => void;
  setInput: (input: string) => void;
  setSessionListCollapsed: (value: boolean) => void;
  setActiveJob: (activeJob: ChatJob | null) => void;
  setStatusText: (statusText: string | null) => void;
  setClarificationOptions: (clarificationOptions: ClarificationOption[]) => void;
  setError: (error: string | null) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  apiKey: localStorage.getItem(CHAT_API_KEY_KEY) || "",
  apiKeyInput: localStorage.getItem(CHAT_API_KEY_KEY) || "",
  input: "",
  isSessionListCollapsed: false,
  activeJob: null,
  statusText: null,
  clarificationOptions: [],
  error: null,
  setApiKeyInput: (apiKeyInput) => set({ apiKeyInput }),
  saveApiKey: () => {
    const apiKey = get().apiKeyInput.trim();
    localStorage.setItem(CHAT_API_KEY_KEY, apiKey);
    set({ apiKey });
  },
  setInput: (input) => set({ input }),
  setSessionListCollapsed: (value) => set({ isSessionListCollapsed: value }),
  setActiveJob: (activeJob) => set({ activeJob }),
  setStatusText: (statusText) => set({ statusText }),
  setClarificationOptions: (clarificationOptions) => set({ clarificationOptions }),
  setError: (error) => set({ error }),
}));

function stepText(step?: string) {
  const labels: Record<string, string> = {
    queued: "Queued",
    checking_context: "Checking context",
    embedding: "Preparing context",
    taking_decision: "Choosing next action",
    authorizing: "Authorizing query",
    executing_query: "Executing query",
    shaping_result: "Shaping result",
    formatting_response: "Formatting response",
    response: "Finalizing response",
  };
  return step ? labels[step] || step.replaceAll("_", " ") : null;
}

function sessionFromCreated(created: Pick<ChatSession, "id" | "title" | "created_at">): ChatSession {
  return {
    id: created.id,
    api_key_id: "",
    title: created.title,
    status: "active",
    context_json: {},
    created_at: created.created_at,
    updated_at: created.created_at,
    expires_at: null,
    archived_at: null,
  };
}

function activeJobCache(): ActiveJobCache | null {
  try {
    return JSON.parse(localStorage.getItem(CHAT_ACTIVE_JOB_KEY) || "null") as ActiveJobCache | null;
  } catch {
    return null;
  }
}

function saveActiveJob(job: ChatJob) {
  localStorage.setItem(CHAT_ACTIVE_JOB_KEY, JSON.stringify({ jobId: job.job_id, sessionId: job.session_id }));
}

function clearActiveJob() {
  localStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
}

function clarificationOptionsFrom(job: ChatJob): ClarificationOption[] {
  const state = job.state_json as { options?: ClarificationOption[]; clarification?: { options?: ClarificationOption[] } } | null;
  return state?.options || state?.clarification?.options || [];
}

export function useChat() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionParam = searchParams.get("session");
  const streamAbort = useRef<AbortController | null>(null);
  const {
    apiKey,
    apiKeyInput,
    input,
    isSessionListCollapsed,
    activeJob,
    statusText,
    clarificationOptions,
    error,
    setApiKeyInput,
    saveApiKey,
    setInput,
    setSessionListCollapsed,
    setActiveJob,
    setStatusText,
    setClarificationOptions,
    setError,
  } = useChatStore();

  const sessionsQuery = useQuery({
    queryKey: CHAT_QUERY_KEYS.sessions(apiKey),
    queryFn: () => chatService.ListSessions(apiKey),
    enabled: Boolean(apiKey),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const sessions = useMemo(() => sessionsQuery.data || [], [sessionsQuery.data]);
  const selectedId = useMemo(() => {
    if (sessions.some((session) => session.id === sessionParam)) return sessionParam;
    return sessions[0]?.id || null;
  }, [sessionParam, sessions]);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedId) || null,
    [selectedId, sessions],
  );

  const messagesQuery = useQuery({
    queryKey: selectedId ? CHAT_QUERY_KEYS.messages(apiKey, selectedId) : ["chat", "messages", apiKey, "none"],
    queryFn: () => chatService.ListMessages(apiKey, selectedId || ""),
    enabled: Boolean(apiKey && selectedId),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const messages = messagesQuery.data || [];

  const refreshCurrentChat = useCallback(async (sessionId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(apiKey, sessionId) }),
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.sessions(apiKey) }),
    ]);
  }, [apiKey, queryClient]);

  const finishJob = useCallback(async (sessionId: string) => {
    streamAbort.current?.abort();
    clearActiveJob();
    setActiveJob(null);
    setStatusText(null);
    setClarificationOptions([]);
    await refreshCurrentChat(sessionId);
  }, [refreshCurrentChat, setActiveJob, setClarificationOptions, setStatusText]);

  const openStream = useCallback((jobId: string, sessionId: string) => {
    if (!apiKey) return;
    streamAbort.current?.abort();
    const abort = new AbortController();
    streamAbort.current = abort;
    void streamChatJob(apiKey, jobId, (event, data) => {
      if (event === "status") {
        const job = data as ChatJob;
        setActiveJob(job);
        setStatusText(stepText(job.current_step));
        return;
      }
      const update = data as ChatStreamUpdate;
      setStatusText(stepText(update.step));
      if (update.kind === "clarification") {
        setClarificationOptions(update.payload?.options || []);
        const currentJob = useChatStore.getState().activeJob;
        setActiveJob(currentJob ? { ...currentJob, status: "waiting_for_user_input" } : null);
      }
      if (update.kind === "final") void finishJob(sessionId);
      if (update.kind === "error") {
        clearActiveJob();
        setError(update.payload?.message || "Chat job failed");
        setActiveJob(null);
      }
    }, abort.signal).catch((cause) => {
      if (!abort.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Chat stream failed");
        setActiveJob(null);
      }
    });
  }, [apiKey, finishJob, setActiveJob, setClarificationOptions, setError, setStatusText]);

  const createSessionMutation = useMutation({
    mutationFn: () => chatService.CreateSession(apiKey, "Fineract analysis"),
    onSuccess: (created) => {
      const session = sessionFromCreated(created);
      queryClient.setQueryData<ChatSession[]>(CHAT_QUERY_KEYS.sessions(apiKey), (current = []) => [session, ...current]);
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(apiKey, session.id), []);
      setSearchParams({ session: session.id });
    },
  });

  const startJobMutation = useMutation({
    mutationFn: async (message: string) => {
      let session = selectedSession;
      if (!session) {
        const created = await chatService.CreateSession(apiKey, "Fineract analysis");
        const newSession = sessionFromCreated(created);
        queryClient.setQueryData<ChatSession[]>(CHAT_QUERY_KEYS.sessions(apiKey), (current = []) => [newSession, ...current]);
        queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(apiKey, newSession.id), []);
        setSearchParams({ session: newSession.id });
        session = newSession;
      }
      return chatService.StartJob(apiKey, session.id, message);
    },
    onSuccess: (job, message) => {
      saveActiveJob(job);
      setActiveJob(job);
      setStatusText(stepText(job.current_step));
      setInput("");
      setError(null);
      setClarificationOptions([]);
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(apiKey, job.session_id), (current = []) => [
        ...current,
        {
          id: job.user_message_id || crypto.randomUUID(),
          session_id: job.session_id,
          job_id: job.job_id,
          role: "user",
          content: message,
          metadata_json: {},
          created_at: new Date().toISOString(),
        },
      ]);
      openStream(job.job_id, job.session_id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Failed to send message"),
  });

  const respondToJobMutation = useMutation({
    mutationFn: (message: string) => {
      if (!activeJob) throw new Error("No active chat job");
      return chatService.RespondToJob(apiKey, activeJob.job_id, message);
    },
    onSuccess: (reply) => {
      if (!activeJob) return;
      setClarificationOptions([]);
      queryClient.setQueryData<ChatMessage[]>(CHAT_QUERY_KEYS.messages(apiKey, reply.session_id), (current = []) => [...current, reply]);
      openStream(activeJob.job_id, reply.session_id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Failed to answer clarification"),
  });

  useEffect(() => {
    if (!selectedId || sessionParam === selectedId) return;
    setSearchParams({ session: selectedId }, { replace: true });
  }, [selectedId, sessionParam, setSearchParams]);

  useEffect(() => {
    if (!apiKey || !selectedId) return;
    const cachedJob = activeJobCache();
    if (!cachedJob || cachedJob.sessionId !== selectedId || activeJob?.job_id === cachedJob.jobId) return;
    const timeout = window.setTimeout(() => {
      void chatService.GetJob(apiKey, cachedJob.jobId).then((job) => {
        if (finishedStatuses.has(job.status)) {
          clearActiveJob();
          return;
        }
        if (!activeStatuses.has(job.status)) return;
        setActiveJob(job);
        setStatusText(stepText(job.current_step));
        setClarificationOptions(job.status === "waiting_for_user_input" ? clarificationOptionsFrom(job) : []);
        openStream(job.job_id, job.session_id);
      }).catch(() => clearActiveJob());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeJob?.job_id, apiKey, openStream, selectedId, setActiveJob, setClarificationOptions, setStatusText]);

  useEffect(() => () => streamAbort.current?.abort(), []);

  const sendMessage = () => {
    const message = input.trim();
    if (!apiKey || !message || activeStatuses.has(activeJob?.status || "") || startJobMutation.isPending) return;
    startJobMutation.mutate(message);
  };

  const answerClarification = (message: string) => {
    if (!apiKey || !activeJob) return;
    respondToJobMutation.mutate(message);
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
    isLoadingMessages: messagesQuery.isLoading,
    isSending: activeStatuses.has(activeJob?.status || "") || startJobMutation.isPending || respondToJobMutation.isPending,
    statusText,
    error: error || (sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null) || (messagesQuery.error instanceof Error ? messagesQuery.error.message : null),
    clarificationOptions,
    setApiKeyInput,
    saveApiKey,
    setInput,
    setSessionListCollapsed,
    selectSession: (sessionId: string) => setSearchParams({ session: sessionId }),
    createSession: () => createSessionMutation.mutate(),
    sendMessage,
    answerClarification,
  };
}
