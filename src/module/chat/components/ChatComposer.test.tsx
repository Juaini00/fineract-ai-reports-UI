import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ChatComposer, { composerKeyAction } from "./ChatComposer";

describe("ChatComposer", () => {
  it("renders a labelled composer, named send button, and disabled reason", () => {
    const html = renderToStaticMarkup(<ChatComposer value="A report" disabled disabledReason="Please wait" onChange={vi.fn()} onSend={vi.fn()} />);
    expect(html).toContain('aria-label="Message Fineract AI"');
    expect(html).toContain("Send message");
    expect(html).toContain("Please wait");
    expect(html).toContain("disabled");
    expect(html).toContain('maxLength="1000"');
  });

  it("sends on Enter but preserves Shift+Enter and composing input", () => {
    expect(composerKeyAction("Enter", false, false)).toBe("send");
    expect(composerKeyAction("Enter", true, false)).toBe("newline");
    expect(composerKeyAction("Enter", false, true)).toBe("newline");
    expect(composerKeyAction("Escape", false, false)).toBe("none");
  });
});
