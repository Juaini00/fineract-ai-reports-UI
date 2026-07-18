import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it.each([false, true])("includes the base pointer class when disabled is %s", (disabled) => {
    const html = renderToStaticMarkup(<Button disabled={disabled}>Action</Button>);

    expect(html).toMatch(/class="[^"]*cursor-pointer/);
  });
});
