import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DropdownMenu } from "../../../shared/components/ui/dropdown-menu";
import { AccountMenuGroup } from "./HeaderControls";

describe("AccountMenuGroup", () => {
  it("renders its label inside the required menu group context", () => {
    const html = renderToStaticMarkup(<DropdownMenu><AccountMenuGroup /></DropdownMenu>);

    expect(html).toContain('data-slot="dropdown-menu-group"');
    expect(html).toContain('data-slot="dropdown-menu-label"');
    expect(html).toContain("Your account");
  });
});
