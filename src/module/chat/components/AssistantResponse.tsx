import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../types";

type AnyRecord = Record<string, unknown>;

const responseTypes = new Set([
  "summary", "table", "metric_cards", "clarification", "help", "unsupported",
  "out_of_domain", "policy_blocked", "error",
]);

function record(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function records(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is AnyRecord => item !== null) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function fallback(message: ChatMessage) {
  if (message.content) return <ReactMarkdown>{message.content}</ReactMarkdown>;
  return <p>This response could not be displayed</p>;
}

function evidenceLabel(reference: unknown) {
  if (typeof reference === "string") return reference;
  const item = record(reference);
  if (!item) return "";
  return [item.label, item.title, item.id, item.url].map(text).filter(Boolean).join(" — ");
}

function optionLabel(option: unknown) {
  if (typeof option === "string") return option.trim() ? option : "";
  const item = record(option);
  if (!item || typeof item.id !== "string" || !item.id.trim() || item.id.length > 200) return "";
  return [item.label, item.description, item.title, item.id].map(text).find((value) => value.trim()) || "";
}

export default function AssistantResponse({ message }: { message: ChatMessage }) {
  const metadata = record(message.metadata_json);
  const structured = record(metadata?.assistant_response);
  if (!structured || !responseTypes.has(text(structured.response_type))) return fallback(message);

  const table = record(structured.table);
  const columns = records(table?.columns).filter((column) => text(column.key));
  const rows = records(table?.rows);
  const renderableTable = table && columns.length > 0 ? table : undefined;
  const cards = records(structured.cards).filter((card) => text(card.label) || text(card.title) || text(card.value));
  const sections = records(structured.sections).filter((section) =>
    text(section.title) || text(section.content) || text(section.message) || text(section.body),
  );
  const warnings = strings(structured.warnings);
  const actions = records(structured.actions).filter((action) =>
    text(action.label) || text(action.title) || text(action.message),
  );
  const options = Array.isArray(structured.options) ? structured.options.map(optionLabel).filter(Boolean) : [];
  const evidence = Array.isArray(structured.evidence_refs)
    ? structured.evidence_refs.map(evidenceLabel).filter(Boolean)
    : [];
  const hasStructuredContent = Boolean(
    text(structured.title) || text(structured.message) || renderableTable || cards.length || sections.length ||
    warnings.length || actions.length || options.length || evidence.length,
  );

  if (!hasStructuredContent) return fallback(message);

  return (
    <div className="assistant-result space-y-3">
      {text(structured.title) && <h3 className="font-semibold">{text(structured.title)}</h3>}
      {text(structured.message) && <p>{text(structured.message)}</p>}
      {sections.map((section, index) => {
        const body = text(section.content) || text(section.message) || text(section.body);
        return (text(section.title) || body) ? (
          <section key={index} className="space-y-1">
            {text(section.title) && <h4 className="font-medium">{text(section.title)}</h4>}
            {body && <p>{body}</p>}
          </section>
        ) : null;
      })}
      {cards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {cards.map((card, index) => (
            <div key={index} className="assistant-result-card rounded-xl border p-3">
              {(text(card.label) || text(card.title)) && <p className="text-xs text-muted-foreground">{text(card.label) || text(card.title)}</p>}
              {text(card.value) && <p className="text-lg font-semibold">{text(card.value)}{text(card.unit) ? ` ${text(card.unit)}` : ""}</p>}
              {text(card.trend) && <p className="text-xs text-muted-foreground">{text(card.trend)}</p>}
            </div>
          ))}
        </div>
      )}
      {renderableTable && (
        <div className="assistant-result-table overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/70">
              <tr>{columns.map((column) => <th key={text(column.key)} className="px-3 py-2 font-medium">{text(column.label) || text(column.key)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td className="px-3 py-3 text-muted-foreground" colSpan={Math.max(columns.length, 1)}>No rows returned.</td></tr>
              ) : rows.map((row, index) => (
                <tr key={index} className="border-t">{columns.map((column) => <td key={text(column.key)} className="px-3 py-2">{text(row[text(column.key)])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {warnings.map((warning, index) => <p key={index} className="assistant-result-warning rounded-lg px-3 py-2 text-xs">{warning}</p>)}
      {options.length > 0 && <ul className="flex flex-wrap gap-2" aria-label="Clarification options">{options.map((option, index) => <li key={index} className="rounded-full border px-3 py-1 text-xs">{option}</li>)}</ul>}
      {actions.length > 0 && <div className="flex flex-wrap gap-2">{actions.map((action, index) => {
        const label = text(action.label) || text(action.title) || text(action.message);
        return label ? <span key={index} className="assistant-result-action rounded-full border px-3 py-1 text-xs">{label}</span> : null;
      })}</div>}
      {evidence.length > 0 && <details className="assistant-result-evidence text-xs text-muted-foreground"><summary>Evidence</summary><ul className="mt-2 space-y-1">{evidence.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
    </div>
  );
}
