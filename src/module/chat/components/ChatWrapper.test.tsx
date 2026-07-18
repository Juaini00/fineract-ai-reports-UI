import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OptionalScopePanel } from "./ChatWrapper";

describe("OptionalScopePanel", () => {
  it("keeps a missing key optional and explains bearer access and office scope", () => {
    const html = renderToStaticMarkup(<OptionalScopePanel apiKey="" input="" onApply={vi.fn()} onChange={vi.fn()} onClear={vi.fn()} />);
    expect(html).toContain("Bearer sign-in already provides access");
    expect(html).toContain("only narrows office scope");
    expect(html).toContain('type="password"');
    expect(html).toContain("Apply scope key");
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).not.toContain("<details open");
    expect(html).not.toContain("Create a chat key");
  });

  it("offers clearing when an optional scope key is active", () => {
    const html = renderToStaticMarkup(<OptionalScopePanel apiKey="secret" input="" onApply={vi.fn()} onChange={vi.fn()} onClear={vi.fn()} />);
    expect(html).toContain("Clear scope key");
  });
});
