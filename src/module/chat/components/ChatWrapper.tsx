import { useState } from "react";
import { KeyRound, Menu, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useChat } from "../hooks";
import ChatList from "./ChatList";
import SessionList from "./SessionList";

export function OptionalScopePanel({ apiKey, input, onApply, onChange, onClear }: {
  apiKey: string;
  input: string;
  onApply: () => void;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <aside className="mb-3 shrink-0 rounded-xl border bg-muted/30" aria-label="Optional office scope">
      <details>
        <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium"><KeyRound className="size-4" />Optional office scope</summary>
        <div className="flex flex-col gap-2 border-t p-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
        <p className="mt-1 text-xs text-muted-foreground">Bearer sign-in already provides access. A valid API key only narrows office scope.</p>
          </div>
          <label className="text-xs font-medium" htmlFor="chat-scope-key">Scope API key
            <Input className="mt-1 h-9 lg:w-64" id="chat-scope-key" onChange={(event) => onChange(event.target.value)} placeholder="Paste optional key" type="password" value={input} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button className="h-9" disabled={!input.trim()} onClick={onApply} type="button">Apply scope key</Button>
            {apiKey && <Button className="h-9" onClick={onClear} type="button" variant="outline">Clear scope key</Button>}
          </div>
        </div>
      </details>
    </aside>
  );
}

export default function ChatWrapper() {
  const chat = useChat();
  const [isMobileSessionsOpen, setMobileSessionsOpen] = useState(false);

  return (
    <div className="relative flex h-full min-h-0 gap-3 overflow-hidden bg-muted/40 p-2 sm:p-3">
      <div className="absolute inset-x-2 top-2 z-10 flex items-center bg-card/95 p-1 backdrop-blur md:hidden">
        <Button
          aria-controls="mobile-sessions"
          aria-expanded={isMobileSessionsOpen}
          className="min-h-10 max-w-full cursor-pointer rounded-xl"
          onClick={() => setMobileSessionsOpen(!isMobileSessionsOpen)}
          type="button"
          variant="outline"
        >
          <Menu className="size-4" />
          <span className="truncate">{chat.selectedSession?.title || "Conversations"}</span>
        </Button>
      </div>
      {isMobileSessionsOpen && (
        <>
        <button aria-label="Close conversations" className="absolute inset-0 z-20 bg-foreground/20 backdrop-blur-[1px] md:hidden" onClick={() => setMobileSessionsOpen(false)} type="button" />
        <aside aria-label="Conversation drawer" className="absolute inset-y-2 left-2 z-30 w-[min(18rem,calc(100%-1rem))] md:hidden" id="mobile-sessions">
          <Button aria-label="Close conversations" className="absolute right-2 top-2 z-10" onClick={() => setMobileSessionsOpen(false)} size="icon" type="button" variant="ghost"><X /></Button>
          <SessionList
            sessions={chat.sessions}
            selectedId={chat.selectedId}
            isLoading={chat.isLoadingSessions}
            error={chat.sessionsError}
            isCollapsed={false}
            onSelect={(id) => {
              chat.selectSession(id);
              setMobileSessionsOpen(false);
            }}
            onCreate={chat.createSession}
            onToggleCollapsed={() => setMobileSessionsOpen(false)}
            hideCollapse
          />
        </aside>
        </>
      )}
      <div
        className={cn(
          "hidden h-full min-h-0 shrink-0 transition-[width] duration-300 ease-in-out md:block",
          chat.isSessionListCollapsed ? "w-16" : "w-72",
        )}
      >
        <SessionList
          sessions={chat.sessions}
          selectedId={chat.selectedId}
          isLoading={chat.isLoadingSessions}
          error={chat.sessionsError}
          isCollapsed={chat.isSessionListCollapsed}
          onSelect={chat.selectSession}
          onCreate={chat.createSession}
          onToggleCollapsed={() => chat.setSessionListCollapsed(!chat.isSessionListCollapsed)}
        />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-3 pt-16 shadow-[var(--shadow-panel)] sm:p-4 sm:pt-16 md:pt-4">
        <OptionalScopePanel apiKey={chat.apiKey} input={chat.apiKeyInput} onApply={chat.saveApiKey} onChange={chat.setApiKeyInput} onClear={chat.clearApiKey} />
        <div className="min-h-0 flex-1">
          <ChatList
          key={chat.selectedId}
          selectedSession={chat.selectedSession}
          messages={chat.messages}
          input={chat.input}
          isLoading={chat.isLoadingMessages}
           isSending={chat.isSending}
           isAnswering={chat.isAnswering}
           statusText={chat.statusText}
           error={chat.error}
           clarificationActive={chat.isClarificationActive}
           clarificationMessage={chat.clarificationMessage}
          clarificationOptions={chat.clarificationOptions}
          sendDisabledReason={chat.sendDisabledReason}
          onInputChange={chat.setInput}
          onSend={chat.sendMessage}
          onClarification={chat.answerClarification}
          />
        </div>
      </main>
    </div>
  );
}
