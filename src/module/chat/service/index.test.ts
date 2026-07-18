import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCESS_TOKEN_KEY } from "@/app/config/constants";
import { apiGet, apiPost } from "@/shared/service/api.service";
import { ChatServiceError, chatService } from "./index";

vi.mock("@/shared/service/api.service", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const headers = {
  Authorization: "Bearer access-token",
  "X-API-Key": "chat-key",
};

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

describe("chatService HTTP contract", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: memoryStorage(),
    });
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-token");
  });

  it("uses every endpoint, exact dual headers and payload, and unwraps success", async () => {
    const sessions = [{ id: "session-1" }];
    const created = { id: "session-2", title: "Quarterly", created_at: "now" };
    const session = { id: "session-1", title: "Existing" };
    const messages = [{ id: "message-1" }];
    const startedJob = { id: "job-1", status: "queued" };
    const job = { id: "job-1", status: "completed" };
    const responseMessage = { id: "message-2" };

    get
      .mockResolvedValueOnce({ success: true, data: sessions } as never)
      .mockResolvedValueOnce({ success: true, data: session } as never)
      .mockResolvedValueOnce({ success: true, data: messages } as never)
      .mockResolvedValueOnce({ success: true, data: job } as never);
    post
      .mockResolvedValueOnce({ success: true, data: created } as never)
      .mockResolvedValueOnce({ success: true, data: startedJob } as never)
      .mockResolvedValueOnce({ success: true, data: responseMessage } as never);

    await expect(chatService.ListSessions("chat-key")).resolves.toBe(sessions);
    await expect(chatService.CreateSession("chat-key", "Quarterly")).resolves.toBe(created);
    await expect(chatService.GetSession("chat-key", "session-1")).resolves.toBe(session);
    await expect(chatService.ListMessages("chat-key", "session-1")).resolves.toBe(messages);
    await expect(chatService.StartJob("chat-key", "session-1", "Show sales")).resolves.toBe(startedJob);
    await expect(chatService.GetJob("chat-key", "job-1")).resolves.toBe(job);
    await expect(
      chatService.RespondToJob("chat-key", "job-1", { option_id: "sales", message: "Use sales" }),
    ).resolves.toBe(responseMessage);

    expect(get.mock.calls).toEqual([
      [{ url: "/chat/sessions", headers, silent: true }],
      [{ url: "/chat/sessions/session-1", headers, silent: true }],
      [{ url: "/chat/sessions/session-1/messages", headers, silent: true }],
      [{ url: "/chat/jobs/job-1", headers, silent: true }],
    ]);
    expect(post.mock.calls).toEqual([
      [{ url: "/chat/sessions", headers, silent: true }, { title: "Quarterly" }],
      [{ url: "/chat/jobs", headers, silent: true }, { session_id: "session-1", message: "Show sales" }],
      [
        { url: "/chat/jobs/job-1/responses", headers, silent: true },
        { option_id: "sales", message: "Use sales" },
      ],
    ]);
  });

  it("omits a blank or absent optional API key", async () => {
    get.mockResolvedValue({ success: true, data: [] } as never);

    await chatService.ListSessions("   ");
    await chatService.ListSessions(undefined);

    expect(get).toHaveBeenNthCalledWith(1, {
      url: "/chat/sessions", headers: { Authorization: "Bearer access-token" }, silent: true,
    });
    expect(get).toHaveBeenNthCalledWith(2, {
      url: "/chat/sessions", headers: { Authorization: "Bearer access-token" }, silent: true,
    });
  });

  it("fails before transport when the bearer token is missing", async () => {

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    await expect(chatService.ListSessions("chat-key")).rejects.toThrow("Access token is required");

    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends a null session id, trims messages, and preserves the exact option id", async () => {
    post.mockResolvedValueOnce({ success: true, data: { job_id: "job-1" } } as never)
      .mockResolvedValueOnce({ success: true, data: { id: "message-1" } } as never);

    await chatService.StartJob(undefined, null, "  Show sales  ");
    await chatService.RespondToJob(undefined, "job-1", { message: "  Use sales  ", option_id: " sales " });

    const bearer = { Authorization: "Bearer access-token" };
    expect(post).toHaveBeenNthCalledWith(1,
      { url: "/chat/jobs", headers: bearer, silent: true },
      { session_id: null, message: "Show sales" },
    );
    expect(post).toHaveBeenNthCalledWith(2,
      { url: "/chat/jobs/job-1/responses", headers: bearer, silent: true },
      { message: "Use sales", option_id: " sales " },
    );
  });

  it("validates titles, prompts, and clarification responses before transport", async () => {
    await expect(chatService.CreateSession(undefined, "x".repeat(121))).rejects.toThrow("Title must be 120 characters or fewer.");
    await expect(chatService.StartJob(undefined, null, "   ")).rejects.toThrow("Message must be between 1 and 1000 characters.");
    await expect(chatService.StartJob(undefined, null, "x".repeat(1001))).rejects.toThrow("Message must be between 1 and 1000 characters.");
    await expect(chatService.RespondToJob(undefined, "job-1", { message: "ok", option_id: " " })).rejects.toThrow("Option ID must be between 1 and 200 characters.");
    await expect(chatService.RespondToJob(undefined, "job-1", { message: "x".repeat(1001) })).rejects.toThrow("Message must be between 1 and 1000 characters.");
    expect(post).not.toHaveBeenCalled();
  });

  it("passes through only a short user-safe backend failure message", async () => {
    get.mockResolvedValueOnce({
      success: false,
      error: { code: "INVALID_REQUEST", message: "Choose one of the available reports." },
    } as never);

    await expect(chatService.ListSessions("chat-key")).rejects.toMatchObject({
      message: "Choose one of the available reports.", errorCode: "INVALID_REQUEST",
    });
  });

  it("uses a stable fallback for unsafe errors, transport errors, and malformed envelopes", async () => {
    get
      .mockResolvedValueOnce({
        success: false,
        error: { code: "INTERNAL", message: "SQL query SELECT * FROM users\nstack trace: secret" },
      } as never)
      .mockRejectedValueOnce(new Error("raw body: debug=true&token=secret"))
      .mockResolvedValueOnce({ success: true } as never);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(chatService.ListSessions("chat-key")).rejects.toMatchObject({
        message: "Chat request failed. Please try again.",
      });
    }
  });

  it.each([
    [{ status: 401, errorCode: "unauthorized", message: "token dump" }, "Your session has expired. Please sign in again."],
    [{ status: 403, errorCode: "role_not_authorized", message: "no" }, "Administrator access is required to use chat."],
    [{ status: 404, errorCode: "not_found", message: "missing" }, "This chat resource is no longer available."],
    [{ status: 500, errorCode: "internal_error", message: "Harmless-looking backend detail" }, "Chat request failed. Please try again."],
  ])("maps transformed API errors and preserves reconciliation details", async (apiError, message) => {
    get.mockRejectedValueOnce(apiError);
    const error = await chatService.ListSessions(undefined).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ChatServiceError);
    expect(error).toMatchObject({ message, status: apiError.status, errorCode: apiError.errorCode });
  });

  it("allows only safe short correction text for a 400", async () => {
    get.mockRejectedValueOnce({ status: 400, errorCode: "validation_error", message: "Choose an available report." });
    await expect(chatService.ListSessions(undefined)).rejects.toThrow("Choose an available report.");

    get.mockRejectedValueOnce({ status: 400, errorCode: "validation_error", message: "SQL query secret" });
    await expect(chatService.ListSessions(undefined)).rejects.toThrow("Please correct your chat request and try again.");
  });
});
