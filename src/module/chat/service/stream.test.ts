import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCESS_TOKEN_KEY, API_BASE_URL } from "@/app/config/constants";
import { expireSession, refreshAccessToken } from "@/app/config/axios";
import { parseSseStream, streamChatJob } from "./stream";

vi.mock("@/app/config/axios", () => ({ expireSession: vi.fn(), refreshAccessToken: vi.fn() }));

const encode = (value: string) => new TextEncoder().encode(value);
const body = (...chunks: string[]) => new ReadableStream<Uint8Array>({
  start(controller) {
    chunks.forEach((chunk) => controller.enqueue(encode(chunk)));
    controller.close();
  },
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe("parseSseStream", () => {
  it("frames split UTF-8, CRLF, multiline and final unclosed events", async () => {
    const events: Array<[string, unknown]> = [];
    const bytes = encode(": ping\r\nevent: update\r\ndata: {\"kind\":\"status\",\r\ndata: \"payload\":{\"message\":\"café\"}}\r\n\r\nignored: x\nevent: update\ndata: {\"kind\":\"final\"}");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const split = bytes.indexOf(0xc3) + 1;
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split, bytes.length - 8));
        controller.enqueue(bytes.slice(bytes.length - 8));
        controller.close();
      },
    });

    await parseSseStream(stream, (event, data) => events.push([event, data]));

    expect(events).toEqual([
      ["update", { kind: "status", payload: { message: "café" } }],
      ["update", { kind: "final" }],
    ]);
  });

  it("ignores malformed JSON and continues with later valid events", async () => {
    const events: Array<[string, unknown]> = [];
    await parseSseStream(
      body("event: bad\ndata: nope\n\nevent: update\ndata: {\"kind\":\"status\"}\n\n"),
      (event, data) => events.push([event, data]),
    );
    expect(events).toEqual([["update", { kind: "status" }]]);
  });

  it("ignores unknown event names", async () => {
    const events: Array<[string, unknown]> = [];
    await parseSseStream(
      body("event: clarification\ndata: {\"kind\":\"clarification\"}\n\nevent: update\ndata: {\"kind\":\"clarification\"}\n\n"),
      (event, data) => events.push([event, data]),
    );
    expect(events).toEqual([["update", { kind: "clarification" }]]);
  });

  it("cancels the reader and rejects with AbortError when aborted", async () => {
    const cancelled = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ cancel: cancelled });
    const controller = new AbortController();
    controller.abort();

    await expect(parseSseStream(stream, vi.fn(), controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it("dispatches one real terminal event and stops consuming", async () => {
    const events: Array<[string, unknown]> = [];
    await parseSseStream(
      body("event: status\ndata: {\"job_id\":\"j1\",\"status\":\"completed\"}\n\nevent: update\ndata: {\"kind\":\"final\"}\n\n"),
      (event, data) => events.push([event, data]),
    );
    expect(events).toEqual([["status", { job_id: "j1", status: "completed" }]]);
  });
});

describe("streamChatJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memoryStorage() });
    localStorage.setItem(ACCESS_TOKEN_KEY, "old-token");
  });

  it("uses the exact URL and authenticated SSE headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(body("event: update\ndata: {\"kind\":\"status\"}\n\n")));
    vi.stubGlobal("fetch", fetchMock);

    await streamChatJob(" chat-key ", "job-1", vi.fn(), new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/chat/jobs/job-1/stream`, {
      headers: { Accept: "text/event-stream", Authorization: "Bearer old-token", "X-API-Key": "chat-key" },
      signal: expect.any(AbortSignal),
    });
  });

  it.each(["", "   "])("accepts an optional API key without sending its header", async (apiKey) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(body("event: status\ndata: {\"job_id\":\"job-1\",\"status\":\"running\",\"current_step\":\"queued\"}\n\n")));
    vi.stubGlobal("fetch", fetchMock);

    await streamChatJob(apiKey, "job-1", vi.fn(), new AbortController().signal);

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      Accept: "text/event-stream", Authorization: "Bearer old-token",
    });
  });

  it("refreshes only the first 401 and reopens once with the new token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(body("event: update\ndata: {\"kind\":\"status\"}\n\n")));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(refreshAccessToken).mockResolvedValue("new-token");

    await streamChatJob("chat-key", "job-1", vi.fn(), new AbortController().signal);

    expect(refreshAccessToken).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      headers: { Accept: "text/event-stream", Authorization: "Bearer new-token", "X-API-Key": "chat-key" },
    });
  });

  it("rejects before fetch for a missing bearer token", async () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(streamChatJob("chat-key", "job-1", vi.fn(), new AbortController().signal)).rejects.toThrow("Access token is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("expires the shared session after the reopened stream also returns 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    vi.mocked(refreshAccessToken).mockResolvedValue("new-token");

    await expect(streamChatJob("", "job-1", vi.fn(), new AbortController().signal)).rejects.toThrow("Chat stream failed. Please try again.");

    expect(expireSession).toHaveBeenCalledOnce();
  });

  it.each([
    [new Response(null, { status: 500 }), 1],
    [new Response(null, { status: 401 }), 2],
    [new Response(null), 1],
  ])("uses a safe error for failed or bodyless responses", async (lastResponse, attempts) => {
    const responses = attempts === 2 ? [new Response(null, { status: 401 }), lastResponse] : [lastResponse];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(responses.shift())));
    vi.mocked(refreshAccessToken).mockResolvedValue("new-token");
    await expect(streamChatJob("chat-key", "job-1", vi.fn(), new AbortController().signal)).rejects.toThrow(
      "Chat stream failed. Please try again.",
    );
    expect(refreshAccessToken).toHaveBeenCalledTimes(attempts - 1);
  });
});
