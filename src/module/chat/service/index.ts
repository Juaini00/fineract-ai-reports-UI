import { API_BASE_URL } from "@/app/config/constants";
import { apiGet, apiPost } from "@/shared/service/api.service";
import type { ApiResponse } from "@/shared/types";
import type {
  ChatJob,
  ChatMessage,
  ChatSession,
  ChatStreamUpdate,
} from "../types";

function unwrap<T>(response: ApiResponse<T>) {
  if (!response.success) throw new Error(response.error?.message || "Chat request failed");
  return response.data;
}

export const chatService = {
  ListSessions: async (apiKey: string): Promise<ChatSession[]> => {
    const response = await apiGet<ApiResponse<ChatSession[]>>({
      url: "/chat/sessions",
      headers: { "X-API-Key": apiKey },
      silent: true,
    });
    return unwrap(response);
  },
  CreateSession: async (apiKey: string, title?: string): Promise<Pick<ChatSession, "id" | "title" | "created_at">> => {
    const response = await apiPost<ApiResponse<Pick<ChatSession, "id" | "title" | "created_at">>, { title?: string }>({
      url: "/chat/sessions",
      headers: { "X-API-Key": apiKey },
      silent: true,
    }, { title });
    return unwrap(response);
  },
  ListMessages: async (apiKey: string, sessionId: string): Promise<ChatMessage[]> => {
    const response = await apiGet<ApiResponse<ChatMessage[]>>({
      url: `/chat/sessions/${sessionId}/messages`,
      headers: { "X-API-Key": apiKey },
      silent: true,
    });
    return unwrap(response);
  },
  StartJob: async (apiKey: string, sessionId: string, message: string): Promise<ChatJob> => {
    const response = await apiPost<ApiResponse<ChatJob>, { session_id: string; message: string }>({
      url: "/chat/jobs",
      headers: { "X-API-Key": apiKey },
      silent: true,
    }, { session_id: sessionId, message });
    return unwrap(response);
  },
  RespondToJob: async (apiKey: string, jobId: string, message: string): Promise<ChatMessage> => {
    const response = await apiPost<ApiResponse<ChatMessage>, { message: string }>({
      url: `/chat/jobs/${jobId}/responses`,
      headers: { "X-API-Key": apiKey },
      silent: true,
    }, { message });
    return unwrap(response);
  },
  GetJob: async (apiKey: string, jobId: string): Promise<ChatJob> => {
    const response = await apiGet<ApiResponse<ChatJob>>({
      url: `/chat/jobs/${jobId}`,
      headers: { "X-API-Key": apiKey },
      silent: true,
    });
    return unwrap(response);
  },
};

export async function streamChatJob(
  apiKey: string,
  jobId: string,
  onEvent: (event: string, data: unknown) => void,
  signal: AbortSignal,
) {
  const response = await fetch(`${API_BASE_URL}/chat/jobs/${jobId}/stream`, {
    headers: { Accept: "text/event-stream", "X-API-Key": apiKey },
    signal,
  });
  if (!response.ok || !response.body) throw new Error("Unable to stream chat job");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "message";
  let data = "";

  const flush = () => {
    if (!data) return;
    onEvent(event, JSON.parse(data) as ChatJob | ChatStreamUpdate);
    event = "message";
    data = "";
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) {
        flush();
      } else if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }
    if (done) break;
  }
  flush();
}
