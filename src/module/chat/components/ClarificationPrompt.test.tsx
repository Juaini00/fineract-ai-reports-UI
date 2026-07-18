import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ClarificationPrompt, { clarificationPayload, freeTextClarificationPayload } from "./ClarificationPrompt";

describe("clarificationPayload", () => {
  it("uses the exact backend id and visible label with description/title fallbacks", () => {
    expect(clarificationPayload({ id: "sales", label: "Sales report" })).toEqual({ option_id: "sales", message: "Sales report" });
    expect(clarificationPayload({ id: "loans", description: "Loan report" })).toEqual({ option_id: "loans", message: "Loan report" });
    expect(clarificationPayload({ id: "clients", title: "Client report" })).toEqual({ option_id: "clients", message: "Client report" });
  });

  it("treats every returned id, including others, as an exact choice", () => {
    expect(clarificationPayload({ id: "others", label: "Others" })).toEqual({ option_id: "others", message: "Others" });
  });

  it("rejects strings, malformed options, and options without ids", () => {
    expect(clarificationPayload("Sales")).toBeNull();
    expect(clarificationPayload({ label: "Sales" } as never)).toBeNull();
    expect(clarificationPayload({ id: "", label: "Sales" })).toBeNull();
    expect(clarificationPayload({ id: "x".repeat(201), label: "Sales" })).toBeNull();
  });

  it("submits ordinary free text without an option id", () => {
    expect(freeTextClarificationPayload("  My report  ")).toEqual({ message: "My report" });
    expect(freeTextClarificationPayload("   ")).toBeNull();
    expect(freeTextClarificationPayload("x".repeat(1001))).toBeNull();
  });
});

describe("ClarificationPrompt", () => {
  it("renders only accessible choices with backend message, disabled state, and error", () => {
    const html = renderToStaticMarkup(
      <ClarificationPrompt
        options={[{ id: "sales", label: "Sales" }, { id: "others", label: "Others" }, "invalid"]}
        disabled
        error="Choose again"
        message="Which office should be included?"
        onSubmit={vi.fn()}
      />,
    );
    expect(html).toContain("Sales");
    expect(html).toContain("Others");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Choose again");
    expect(html).toContain("Which office should be included?");
    expect(html).not.toContain("Your clarification");
    expect(html).not.toContain("Submit clarification");
    expect(html).toContain("disabled");
    expect(html).not.toContain("invalid</button>");
  });

  it("renders only ordinary free text without valid options", () => {
    const html = renderToStaticMarkup(<ClarificationPrompt options={["invalid"]} disabled={false} error={null} message="" onSubmit={vi.fn()} />);
    expect(html).toContain("Your clarification");
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain("Submit clarification");
    expect(html).not.toContain("invalid</button>");
    expect(html).not.toContain('type="button"');
  });
});
