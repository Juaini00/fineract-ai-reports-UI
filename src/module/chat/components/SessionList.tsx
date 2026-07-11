type Conversation = {
  id: string;
  name: string;
  channel: string;
  status: string;
  summary: string;
  time: string;
  sentiment: string;
  unread: number;
};

export default function SessionList({
  conversations,
  selectedId,
}: {
  conversations: Conversation[];
  selectedId: string;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sessions
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Active chats</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-scroll p-3">
        {conversations.map((conversation) => {
          const active = conversation.id === selectedId;

          return (
            <button
              key={conversation.id}
              className={`w-full rounded-xl border p-3 text-left transition hover:border-primary/30 hover:bg-muted/60 ${
                active
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : "border-transparent bg-transparent"
              }`}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {conversation.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{conversation.channel}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {conversation.time}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {conversation.summary}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {conversation.status}
                </span>
                {conversation.unread > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    {conversation.unread}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
