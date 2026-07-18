import { describe, expect, it } from "vitest";

import {
  isActiveJobStatus,
  isChatJobResponse,
  isTerminalJobStatus,
  normalizeClarificationOptions,
} from "./index";

describe("chat contract guards", () => {
  it("distinguishes terminal and active job statuses", () => {
    expect(isTerminalJobStatus("completed")).toBe(true);
    expect(isTerminalJobStatus("cancelled")).toBe(true);
    expect(isTerminalJobStatus("running")).toBe(false);
    expect(isActiveJobStatus("waiting_for_user_input")).toBe(true);
    expect(isActiveJobStatus("expired")).toBe(false);
    expect(isActiveJobStatus("future_status")).toBe(false);
  });

  it("accepts clarification text with an optional option id", () => {
    expect(isChatJobResponse({ option_id: "sales", message: "Use sales" })).toBe(true);
    expect(isChatJobResponse({ message: "Use sales" })).toBe(true);
    expect(isChatJobResponse({ option_id: "sales" })).toBe(false);
    expect(isChatJobResponse({ option_id: 1, message: "Use sales" })).toBe(false);
  });

  it("keeps strings and selectable object options while dropping malformed input", () => {
    expect(
      normalizeClarificationOptions([
        "All reports",
        { id: "sales", label: "Sales", future_field: true },
        { label: "Missing backend id" },
        null,
      ]),
    ).toEqual(["All reports", { id: "sales", label: "Sales", future_field: true }]);
    expect(normalizeClarificationOptions({ id: "not-an-array" })).toEqual([]);
  });
});
