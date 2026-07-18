import { ChevronsLeft, ChevronsRight, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ChatSession } from "../types";

const recency = (value: string) => new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });

export default function SessionList({
  sessions,
  selectedId,
  isLoading,
  error,
  isCollapsed,
  onSelect,
  onCreate,
  onToggleCollapsed,
  hideCollapse = false,
}: {
  sessions: ChatSession[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  isCollapsed: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onToggleCollapsed: () => void;
  hideCollapse?: boolean;
}) {
  if (isCollapsed) {
    return (
      <nav aria-label="Conversation history" className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-2">
        <Button aria-label="Expand conversation history" aria-expanded="false" className="min-h-10 min-w-10" onClick={onToggleCollapsed} size="icon" type="button" variant="ghost"><ChevronsRight /></Button>
        <Button aria-label="New chat" className="min-h-10 min-w-10" onClick={onCreate} size="icon" type="button"><Plus /></Button>
        <ul className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto" aria-label="Recent conversations">
          {sessions.map((item) => <li key={item.id}><button aria-current={item.id === selectedId ? "page" : undefined} aria-label={item.title || "Untitled chat"} className={cn("flex size-10 items-center justify-center rounded-lg", item.id === selectedId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => onSelect(item.id)} type="button"><MessageCircle className="size-4" /></button></li>)}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Conversation history" className="flex h-full min-h-0 flex-col rounded-xl border bg-card">
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Chats</h2>
          {!hideCollapse && <Button aria-label="Collapse conversation history" aria-expanded="true" className="min-h-10 min-w-10" onClick={onToggleCollapsed} size="icon" type="button" variant="ghost"><ChevronsLeft /></Button>}
        </div>
        <Button className="mt-2 min-h-10 w-full" onClick={onCreate} type="button"><Plus aria-hidden="true" />New chat</Button>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && <p className="p-2 text-sm text-muted-foreground" role="status">Loading chats…</p>}
        {error && <p className="chat-error rounded-lg p-2 text-sm" role="alert">{error}</p>}
        {!isLoading && !error && sessions.length === 0 && <p className="p-2 text-sm text-muted-foreground">No chats yet.</p>}
        {!isLoading && !error && sessions.length > 0 && (
          <ul className="space-y-1">
            {sessions.map((item) => (
              <li key={item.id}>
                <button aria-current={item.id === selectedId ? "page" : undefined} className={cn("flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted", item.id === selectedId && "bg-muted")} onClick={() => onSelect(item.id)} type="button">
                  <span className="truncate text-sm font-medium">{item.title || "Untitled chat"}</span>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.updated_at}>{recency(item.updated_at)}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
