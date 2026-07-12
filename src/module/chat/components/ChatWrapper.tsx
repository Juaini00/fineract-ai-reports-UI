import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useChat } from "../hooks";
import ChatList from "./ChatList";
import SessionList from "./SessionList";

export default function ChatWrapper() {
  const chat = useChat();

  if (!chat.apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Connect chat API key</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chat endpoints require a user-owned API key. Authentication stays handled by the dashboard flow.
          </p>
          <div className="mt-5 flex gap-2">
            <Input
              value={chat.apiKeyInput}
              onChange={(event) => chat.setApiKeyInput(event.target.value)}
              placeholder="Paste API key"
              type="password"
            />
            <Button
              className="cursor-pointer transition-all"
              onClick={chat.saveApiKey}
              disabled={!chat.apiKeyInput.trim()}
              type="button"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-5 overflow-hidden bg-muted/30 pb-2">
      <div
        className={cn(
          "h-full min-h-0 shrink-0 transition-[width] duration-300 ease-in-out",
          chat.isSessionListCollapsed ? "w-16" : "w-72",
        )}
      >
        <SessionList
          sessions={chat.sessions}
          selectedId={chat.selectedId}
          isLoading={chat.isLoadingSessions}
          isCollapsed={chat.isSessionListCollapsed}
          onSelect={chat.selectSession}
          onCreate={chat.createSession}
          onToggleCollapsed={() => chat.setSessionListCollapsed(!chat.isSessionListCollapsed)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
        <ChatList
          selectedSession={chat.selectedSession}
          messages={chat.messages}
          input={chat.input}
          isLoading={chat.isLoadingMessages}
          isSending={chat.isSending}
          statusText={chat.statusText}
          error={chat.error}
          clarificationOptions={chat.clarificationOptions}
          onInputChange={chat.setInput}
          onSend={chat.sendMessage}
          onClarification={chat.answerClarification}
        />
      </div>
    </div>
  );
}
