import { expireSession, refreshAccessToken } from "@/app/config/axios";
import { ACCESS_TOKEN_KEY, API_BASE_URL } from "@/app/config/constants";
import type { ChatStreamHandler } from "../types";

const STREAM_FAILURE = "Chat stream failed. Please try again.";
const terminalStatuses = new Set(["completed", "failed", "expired", "cancelled"]);

function abortError(): DOMException {
  return new DOMException("The operation was aborted", "AbortError");
}

function isTerminal(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const value = data as { kind?: unknown; status?: unknown; payload?: { status?: unknown } };
  return value.kind === "final" || value.kind === "error" ||
    terminalStatuses.has(String(value.status)) || terminalStatuses.has(String(value.payload?.status));
}

export async function parseSseStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: ChatStreamHandler,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "message";
  let dataLines: string[] = [];
  let stopped = false;

  const dispatch = () => {
    if (dataLines.length === 0) {
      event = "message";
      return false;
    }
    const text = dataLines.join("\n");
    event ||= "message";
    dataLines = [];
    try {
      const data = JSON.parse(text);
      if (event !== "status" && event !== "update") {
        event = "message";
        return false;
      }
      onEvent(event, data);
      const terminal = isTerminal(data);
      event = "message";
      return terminal;
    } catch {
      event = "message";
      return false;
    }
  };

  const consumeLine = (rawLine: string) => {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line) return dispatch();
    if (line.startsWith(":")) return false;
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
    return false;
  };

  const onAbort = () => { void reader.cancel(); };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    while (!stopped) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (signal?.aborted) throw abortError();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0 && !stopped) {
        stopped = consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    if (!stopped && buffer) stopped = consumeLine(buffer);
    if (!stopped) dispatch();
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try { await reader.cancel(); } catch { /* stream is already closed or errored */ }
    reader.releaseLock();
  }
}

export async function streamChatJob(
  apiKey: string,
  jobId: string,
  onEvent: ChatStreamHandler,
  signal: AbortSignal,
): Promise<void> {
  const key = apiKey.trim();
  let token = localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
  if (!token) throw new Error("Access token is required");

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (signal.aborted) throw abortError();
      const headers: Record<string, string> = { Accept: "text/event-stream", Authorization: `Bearer ${token}` };
      if (key) headers["X-API-Key"] = key;
      const response = await fetch(`${API_BASE_URL}/chat/jobs/${jobId}/stream`, {
        headers,
        signal,
      });
      if (response.status === 401 && attempt === 0) {
        token = (await refreshAccessToken()).trim();
        if (!token) throw new Error(STREAM_FAILURE);
        continue;
      }
      if (response.status === 401) expireSession();
      if (!response.ok || !response.body) throw new Error(STREAM_FAILURE);
      await parseSseStream(response.body, onEvent, signal);
      return;
    }
    throw new Error(STREAM_FAILURE);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof Error && error.message === STREAM_FAILURE) throw error;
    throw new Error(STREAM_FAILURE, { cause: error });
  }
}
