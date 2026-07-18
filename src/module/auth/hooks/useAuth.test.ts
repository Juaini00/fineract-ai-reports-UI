import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AUTH_QUERY_KEYS, isProfileQueryEnabled } from "./useAuth";

describe("auth profile query lifecycle", () => {
  it("stops after a failed token and can fetch again for a new token", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let token: string | null = null;
    let fetches = 0;
    const queryFn = async () => {
      fetches += 1;
      if (token === "stale") throw new Error("Unauthorized");
      return token;
    };
    const options = () => ({
      queryKey: AUTH_QUERY_KEYS.profile,
      queryFn,
      enabled: isProfileQueryEnabled(token),
      retry: false as const,
    });
    const observer = new QueryObserver(queryClient, options());
    const unsubscribe = observer.subscribe(() => undefined);

    expect(fetches).toBe(0);

    token = "stale";
    observer.setOptions(options());
    await vi.waitFor(() => expect(observer.getCurrentResult().isError).toBe(true));
    expect(fetches).toBe(1);

    token = null;
    observer.setOptions(options());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetches).toBe(1);
    expect(queryClient.getQueryState(AUTH_QUERY_KEYS.profile)).toBeDefined();

    token = "fresh";
    observer.setOptions(options());
    await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
    expect(fetches).toBe(2);

    unsubscribe();
  });
});
