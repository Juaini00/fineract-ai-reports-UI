import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../types";
import AssistantResponse from "./AssistantResponse";

function render(assistant_response: unknown, content = "plain fallback", metadata: Record<string, unknown> = {}) {
  const message: ChatMessage = {
    id: "message-1",
    session_id: "session-1",
    job_id: "job-1",
    role: "assistant",
    content,
    metadata_json: { ...metadata, assistant_response },
    created_at: "2026-07-18T00:00:00Z",
  };
  return renderToStaticMarkup(<AssistantResponse message={message} />);
}

describe("AssistantResponse", () => {
  it.each([
    ["summary", "Résumé prêt"],
    ["help", "Voici les commandes"],
    ["unsupported", "Ce rapport n’est pas pris en charge"],
    ["out_of_domain", "Cette demande est hors domaine"],
    ["policy_blocked", "Cette demande est bloquée"],
    ["error", "Le rapport a échoué"],
  ])("renders recognized %s copy", (response_type, message) => {
    expect(render({ response_type, message })).toContain(message);
  });

  it("renders ordered columns, actual rows, and a horizontal wrapper", () => {
    const html = render({
      response_type: "table",
      table: {
        columns: [{ key: "name", label: "Nom" }, { key: "amount", label: "Montant" }],
        rows: [{ name: "A", amount: 10 }, { name: "B", amount: 20 }],
      },
    });
    expect(html.indexOf("Nom")).toBeLessThan(html.indexOf("Montant"));
    expect(html).toContain("A");
    expect(html).toContain("20");
    expect(html).toContain("overflow-x-auto");
    expect(html.match(/<tr/g)).toHaveLength(3);
  });

  it("renders the table zero state without inventing rows", () => {
    const html = render({ response_type: "table", table: { columns: [{ key: "name", label: "Name" }], rows: [] } });
    expect(html).toContain("No rows returned.");
  });

  it("renders cards, sections, warnings, actions, and safe collapsible evidence", () => {
    const html = render({
      response_type: "metric_cards",
      cards: [{ label: "Loans", value: 7, unit: "open" }],
      sections: [{ title: "Détails", content: "Texte exact" }],
      warnings: ["Données partielles"],
      actions: [{ label: "Télécharger" }],
      evidence_refs: [
        { id: "ref-1", label: "Ledger", url: "https://example.test/ref", query: "secret", debug: { trace: true } },
      ],
    });
    for (const copy of ["Loans", "7 open", "Détails", "Texte exact", "Données partielles", "Télécharger", "Evidence", "Ledger", "ref-1", "https://example.test/ref"]) {
      expect(html).toContain(copy);
    }
    expect(html).not.toContain("secret");
    expect(html).not.toContain("trace");
    expect(html).toContain("<details");
  });

  it("renders clarification options in order as inert labels and ignores malformed data", () => {
    const html = render({
      response_type: "clarification",
      options: ["All reports", { id: "sales", label: "Sales" }, { id: "loans", description: "Loans" }, { debug: "secret" }],
    }, "fallback");
    expect(html.indexOf("All reports")).toBeLessThan(html.indexOf("Sales"));
    expect(html.indexOf("Sales")).toBeLessThan(html.indexOf("Loans"));
    expect(html).not.toContain("<button");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("fallback");
  });

  it("prefers assistant_response and falls directly back to message markdown", () => {
    expect(render({ response_type: "summary", message: "persisted shape" }, "**content**", { structured_response: { response_type: "summary", message: "old shape" } })).toContain("persisted shape");
    const html = render({ response_type: "future_type", message: "do not render", rendered_markdown: "**invented**" }, "**plain content**", { rendered_markdown: "**metadata markdown**" });
    expect(html).toContain("<strong>plain content</strong>");
    expect(html).not.toContain("metadata markdown");
    expect(html).not.toContain("invented");
    expect(render({ response_type: "future_type" }, "plain content")).toContain("plain content");
    expect(render(null, "")).toContain("This response could not be displayed");
  });

  it("falls back from recognized malformed collections in contract order", () => {
    const malformedTable = { response_type: "table", table: { rows: [{ name: "hidden" }] } };
    const emptyCollections = { response_type: "metric_cards", cards: [{}], sections: [{}], actions: [{}] };

    expect(render(malformedTable, "**plain**", { rendered_markdown: "**metadata markdown**" })).toContain("<strong>plain</strong>");
    expect(render(emptyCollections, "plain content")).toContain("plain content");
    expect(render(emptyCollections, "")).toContain("This response could not be displayed");
  });

  it("does not render raw HTML or arbitrary debug metadata", () => {
    const html = render({ response_type: "summary", message: "Safe", stack: "secret stack", query: "select secret" }, "", {
      rendered_markdown: "<script>alert(1)</script>",
    });
    expect(html).toContain("Safe");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("secret stack");
    expect(html).not.toContain("select secret");
  });
});
