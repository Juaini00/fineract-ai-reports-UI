import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { ChevronsLeft, ChevronsRight, MessageCircle, Plus } from "lucide-react";
import type { ChatSession } from "../types";

export default function SessionList({
  sessions,
  selectedId,
  isLoading,
  isCollapsed,
  onSelect,
  onCreate,
  onToggleCollapsed,
}: {
  sessions: ChatSession[];
  selectedId: string | null;
  isLoading: boolean;
  isCollapsed: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onToggleCollapsed: () => void;
}) {
  if (isCollapsed) {
    return (
      <aside className="flex h-full min-h-0 flex-col items-center gap-3 rounded-2xl border border-border bg-white p-2 shadow-sm transition-all duration-300 ease-in-out">
        <Button
          className="h-10 w-10 cursor-pointer rounded-xl transition-all duration-200 hover:scale-105"
          size="icon"
          variant="ghost"
          onClick={onToggleCollapsed}
          type="button"
          title="Expand sessions"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <Button
          className="h-10 w-10 cursor-pointer rounded-xl transition-all duration-200 hover:scale-105"
          size="icon"
          onClick={onCreate}
          type="button"
          title="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              className={cn(
                "flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border text-xs font-semibold transition-all duration-200 hover:scale-105 hover:border-primary/30 hover:bg-muted/60",
                session.id === selectedId ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent bg-transparent text-muted-foreground",
              )}
              onClick={() => onSelect(session.id)}
              type="button"
              title={session.title || "Untitled chat"}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 ease-in-out">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessions</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Active chats</h2>
          </div>
          <Button
            className="h-9 w-9 cursor-pointer rounded-xl transition-all duration-200 hover:scale-105"
            size="icon"
            variant="ghost"
            onClick={onToggleCollapsed}
            type="button"
            title="Collapse sessions"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>
        <Button className="w-full cursor-pointer rounded-xl transition-all duration-200" size="sm" onClick={onCreate} type="button">
          New chat
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-scroll p-3">
        {isLoading &&
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-transparent p-3">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="mt-3 h-3 w-full rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}

        {!isLoading && sessions.length === 0 && (
          <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            No chat sessions yet.
          </p>
        )}

        {!isLoading && sessions.map((session) => {
          const active = session.id === selectedId;

          return (
            <button
              key={session.id}
              className={cn(
                "w-full cursor-pointer rounded-xl border p-3 text-left transition-all duration-200 hover:border-primary/30 hover:bg-muted/60 hover:shadow-sm",
                active ? "border-primary/30 bg-primary/5 shadow-sm" : "border-transparent bg-transparent",
              )}
              onClick={() => onSelect(session.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {session.title || "Untitled chat"}
                  </p>
                  <p className="text-xs text-muted-foreground">{session.status}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(session.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                Updated {new Date(session.updated_at).toLocaleDateString()}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {session.archived_at ? "archived" : "active"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
