import { describe, expect, it } from "vitest";
import { getScrollMode } from "./ChatList";

describe("getScrollMode", () => {
  it("positions initially, follows near the bottom, and preserves when away", () => {
    expect(getScrollMode(false, true)).toBe("auto");
    expect(getScrollMode(true, true)).toBe("smooth");
    expect(getScrollMode(true, false)).toBe("preserve");
  });
});
