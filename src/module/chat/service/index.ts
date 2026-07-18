import { ACCESS_TOKEN_KEY } from "@/app/config/constants";
import { apiGet, apiPost } from "@/shared/service/api.service";
import type { ApiError, ApiResponse } from "@/shared/types";
import type { ChatJob, ChatJobResponse, ChatMessage, ChatSession } from "../types";

export { streamChatJob } from "./stream";

const FALLBACK_MESSAGE = "Chat request failed. Please try again.";
const INVALID_REQUEST_MESSAGE = "Please correct your chat request and try again.";

export class ChatServiceError extends Error {
  status?: number;
  errorCode?: string;

  constructor(message: string, status?: number, errorCode?: string) {
    super(message);
    this.name = "ChatServiceError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

function chatHeaders(apiKey?: string | null) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
  if (!token) throw new ChatServiceError("Access token is required");

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const key = apiKey?.trim();
  if (key) headers["X-API-Key"] = key;
  return headers;
}

function safeText(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const { message } = error as { message?: unknown };
  if (typeof message !== "string") return null;
  const text = message.trim();
  const unsafe = /[\r\n<>{}]|\b(?:debug|exception|query|raw body|secret|sql|stack|token|trace)\b/i;
  return text.length > 0 && text.length <= 160 && !unsafe.test(text) ? text : null;
}

function serviceError(error: unknown): ChatServiceError {
  const apiError: Partial<ApiError> = error && typeof error === "object" ? error as ApiError : {};
  const status = apiError.status;
  const errorCode = apiError.errorCode ?? ("code" in apiError ? apiError.code : undefined);
  const category = errorCode?.toLowerCase();
  let message = FALLBACK_MESSAGE;
  if (status === 401 || category === "unauthorized") message = "Your session has expired. Please sign in again.";
  else if (status === 403 || category === "role_not_authorized") message = "Administrator access is required to use chat.";
  else if (status === 404 || category === "not_found") message = "This chat resource is no longer available.";
  else if (status === 500 || category === "internal_error") message = FALLBACK_MESSAGE;
  else if (status === 400 || category === "invalid_request_body" || category === "validation_error") {
    message = safeText(error) ?? INVALID_REQUEST_MESSAGE;
  } else if (status !== undefined || errorCode) {
    message = safeText(error) ?? FALLBACK_MESSAGE;
  }
  return new ChatServiceError(message, status, errorCode);
}

function unwrap<T>(response: unknown): T {
  if (!response || typeof response !== "object") throw new ChatServiceError(FALLBACK_MESSAGE);

  const envelope = response as Partial<ApiResponse<T>>;
  if (envelope.success === true && Object.prototype.hasOwnProperty.call(envelope, "data")) {
    return envelope.data as T;
  }
  if (envelope.success === false) throw serviceError(envelope.error);
  throw new ChatServiceError(FALLBACK_MESSAGE);
}

async function request<T>(transport: () => Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await transport());
  } catch (error) {
    if (error instanceof ChatServiceError) throw error;
    throw serviceError(error);
  }
}

function validMessage(message: string): string {
  const value = message.trim();
  if (value.length < 1 || value.length > 1000) {
    throw new ChatServiceError("Message must be between 1 and 1000 characters.");
  }
  return value;
}

export const chatService = {
  ListSessions: async (apiKey?: string | null): Promise<ChatSession[]> => {
    const headers = chatHeaders(apiKey);
    return request(() => apiGet<ApiResponse<ChatSession[]>>({ url: "/chat/sessions", headers, silent: true }));
  },
  CreateSession: async (apiKey: string | null | undefined, title?: string): Promise<Pick<ChatSession, "id" | "title" | "created_at">> => {
    if (title !== undefined && title.length > 120) throw new ChatServiceError("Title must be 120 characters or fewer.");
    const headers = chatHeaders(apiKey);
    return request(() => apiPost<ApiResponse<Pick<ChatSession, "id" | "title" | "created_at">>, { title?: string }>(
      { url: "/chat/sessions", headers, silent: true },
      { title },
    ));
  },
  GetSession: async (apiKey: string | null | undefined, sessionId: string): Promise<ChatSession> => {
    const headers = chatHeaders(apiKey);
    return request(() => apiGet<ApiResponse<ChatSession>>({
      url: `/chat/sessions/${sessionId}`,
      headers,
      silent: true,
    }));
  },
  ListMessages: async (apiKey: string | null | undefined, sessionId: string): Promise<ChatMessage[]> => {
    const headers = chatHeaders(apiKey);
    return request(() => apiGet<ApiResponse<ChatMessage[]>>({
      url: `/chat/sessions/${sessionId}/messages`,
      headers,
      silent: true,
    }));
  },
  StartJob: async (apiKey: string | null | undefined, sessionId: string | null, message: string): Promise<ChatJob> => {
    const headers = chatHeaders(apiKey);
    const prompt = validMessage(message);
    return request(() => apiPost<ApiResponse<ChatJob>, { session_id: string | null; message: string }>(
      { url: "/chat/jobs", headers, silent: true },
      { session_id: sessionId, message: prompt },
    ));
  },
  GetJob: async (apiKey: string | null | undefined, jobId: string): Promise<ChatJob> => {
    const headers = chatHeaders(apiKey);
    return request(() => apiGet<ApiResponse<ChatJob>>({ url: `/chat/jobs/${jobId}`, headers, silent: true }));
  },
  RespondToJob: async (apiKey: string | null | undefined, jobId: string, payload: ChatJobResponse): Promise<ChatMessage> => {
    const headers = chatHeaders(apiKey);
    const message = validMessage(payload.message);
    const optionId = payload.option_id;
    if (optionId !== undefined && (!optionId.trim() || optionId.length > 200)) {
      throw new ChatServiceError("Option ID must be between 1 and 200 characters.");
    }
    const response = optionId !== undefined ? { message, option_id: optionId } : { message };
    return request(() => apiPost<ApiResponse<ChatMessage>, ChatJobResponse>(
      { url: `/chat/jobs/${jobId}/responses`, headers, silent: true },
      response,
    ));
  },
};
