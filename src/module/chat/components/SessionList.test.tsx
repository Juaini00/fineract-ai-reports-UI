import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu } from "@/shared/components/ui/dropdown-menu";
import type { ChatSession } from "../types";
import SessionList, { SessionActionItems } from "./SessionList";

const session: ChatSession = {
  id: "session-1",
  user_id: null,
  api_key_id: null,
  title: "Quarterly report",
  status: "active",
  context_json: null,
  created_at: "2026-07-18T00:00:00.000Z",
  updated_at: "2026-07-18T00:00:00.000Z",
  expires_at: null,
  archived_at: null,
};

const renderList = (isCollapsed: boolean) => renderToStaticMarkup(
  <SessionList sessions={[session]} selectedId={session.id} isLoading={false} error={null} isCollapsed={isCollapsed} onSelect={vi.fn()} onCreate={vi.fn()} onToggleCollapsed={vi.fn()} />,
);

describe("SessionList", () => {
  it("renders one named action trigger without direct or nested action buttons when expanded", () => {
    const html = renderList(false);
    const actionTriggers = html.match(/<button[^>]*aria-label="Open actions for Quarterly report"[^>]*>/g) ?? [];

    expect(actionTriggers).toHaveLength(1);
    expect(actionTriggers[0]).toContain("cursor-pointer");
    expect(html.match(/<button[^>]*class="[^"]*cursor-pointer[^"]*"[^>]*>[^<]*<span class="truncate/g)).toHaveLength(1);
    expect(html).not.toMatch(/<button[^>]*(?:Rename|Delete)[^>]*>/);
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
  });

  it("defines disabled Rename and Delete menu items marked Soon", () => {
    const html = renderToStaticMarkup(<DropdownMenu><SessionActionItems /></DropdownMenu>);

    expect(html).toContain("Rename");
    expect(html).toContain("Delete");
    expect(html.match(/data-disabled=""/g)).toHaveLength(2);
    expect(html.match(/Soon/g)).toHaveLength(2);
  });

  it("omits session actions when collapsed", () => {
    const html = renderList(true);

    expect(html).not.toContain("Open actions for Quarterly report");
    expect(html).not.toContain("Rename Quarterly report");
    expect(html).not.toContain("Delete Quarterly report");
    expect(html).toMatch(/<button[^>]*aria-label="Quarterly report"[^>]*class="[^"]*cursor-pointer/);
  });
});
