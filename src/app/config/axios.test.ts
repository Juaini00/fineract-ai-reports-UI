import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const refreshToken = vi.hoisted(() => vi.fn());

vi.mock("@/module/auth/service", () => ({
  authService: { RefreshToken: refreshToken },
}));

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
const location = { protocol: "http:", hostname: "localhost", pathname: "/reports", search: "?page=1", href: "" };

Object.assign(globalThis, { localStorage, sessionStorage });
Object.defineProperty(globalThis, "window", { value: { location }, configurable: true });

let instance: typeof import("./axios").instance;
let refreshAccessToken: typeof import("./axios").refreshAccessToken;
let expireSession: typeof import("./axios").expireSession;

const reject401 = (config: InternalAxiosRequestConfig) =>
  Promise.reject({ config, response: { status: 401 }, isAxiosError: true });

beforeAll(async () => {
  ({ instance, refreshAccessToken, expireSession } = await import("./axios"));
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  location.href = "";
  refreshToken.mockReset();
});

describe("token refresh", () => {
  it("exports one generic expiry action for non-Axios authenticated transports", () => {
    localStorage.setItem("access-token", "old");
    localStorage.setItem("chat-active-job", "job-1");
    expireSession();
    expect(localStorage.getItem("access-token")).toBeNull();
    expect(localStorage.getItem("chat-active-job")).toBeNull();
    expect(location.href).toBe("/signin?returnPage=%2Freports%3Fpage%3D1");
  });
  it("exports the coordinated refresh operation", () => {
    expect(refreshAccessToken).toBeTypeOf("function");
  });

  it("shares one refresh across concurrent 401s and replays both once", async () => {
    refreshToken.mockResolvedValue({ success: true, data: { access_token: "fresh" } });
    const attempts = new Map<string, number>();
    const adapter: AxiosAdapter = async (config) => {
      const count = (attempts.get(config.url!) ?? 0) + 1;
      attempts.set(config.url!, count);
      if (count === 1) return reject401(config);
      return { config, data: config.headers.Authorization, headers: {}, status: 200, statusText: "OK" };
    };

    const [first, second] = await Promise.all([
      instance.get("/first", { adapter }),
      instance.get("/second", { adapter }),
    ]);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(first.data).toBe("Bearer fresh");
    expect(second.data).toBe("Bearer fresh");
    expect([...attempts.values()]).toEqual([2, 2]);
  });

  it("does not refresh a replayed 401", async () => {
    localStorage.setItem("access-token", "old");
    localStorage.setItem("chat-api-key", "local-key");
    sessionStorage.setItem("chat-api-key", "session-key");
    localStorage.setItem("chat-active-job", "job-1");
    sessionStorage.setItem("chat-active-job", "job-1");
    refreshToken.mockResolvedValue({ success: true, data: { access_token: "fresh" } });
    const adapter: AxiosAdapter = (config) => reject401(config);

    await expect(instance.get("/still-unauthorized", { adapter })).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("access-token")).toBeNull();
    expect(localStorage.getItem("chat-api-key")).toBeNull();
    expect(sessionStorage.getItem("chat-api-key")).toBeNull();
    expect(localStorage.getItem("chat-active-job")).toBeNull();
    expect(sessionStorage.getItem("chat-active-job")).toBeNull();
    expect(location.href).toBe("/signin?returnPage=%2Freports%3Fpage%3D1");
  });

  it.each([403, 500])("does not refresh status %s", async (status) => {
    const adapter: AxiosAdapter = (config) =>
      Promise.reject({ config, response: { status }, isAxiosError: true });
    await expect(instance.get("/not-unauthorized", { adapter })).rejects.toMatchObject({ response: { status } });
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it("clears all credentials and rejects when the shared refresh fails", async () => {
    localStorage.setItem("access-token", "old");
    localStorage.setItem("chat-api-key", "local-key");
    sessionStorage.setItem("chat-api-key", "session-key");
    localStorage.setItem("chat-active-job", "job-1");
    refreshToken.mockRejectedValue(new Error("refresh failed"));
    const adapter: AxiosAdapter = (config) => reject401(config);

    const results = await Promise.allSettled([
      instance.get("/first", { adapter }),
      instance.get("/second", { adapter }),
    ]);

    expect(results.every(({ status }) => status === "rejected")).toBe(true);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("access-token")).toBeNull();
    expect(localStorage.getItem("chat-api-key")).toBeNull();
    expect(sessionStorage.getItem("chat-api-key")).toBeNull();
    expect(localStorage.getItem("chat-active-job")).toBeNull();
    expect(location.href).toBe("/signin?returnPage=%2Freports%3Fpage%3D1");
  });
});
