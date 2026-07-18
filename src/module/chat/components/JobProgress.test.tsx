import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import JobProgress from "./JobProgress";

describe("JobProgress", () => {
  it("renders one calm polite status without fabricated progress", () => {
    const html = renderToStaticMarkup(<JobProgress label="Checking permissions" active />);
    expect(html).toContain('aria-live="polite"');
    expect(html.match(/Checking permissions/g)).toHaveLength(1);
    expect(html).not.toMatch(/%|timeline|step/i);
  });

  it("renders nothing while inactive", () => {
    expect(renderToStaticMarkup(<JobProgress label="Done" active={false} />)).toBe("");
  });
});
