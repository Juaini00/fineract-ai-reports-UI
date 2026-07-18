import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ChatJobResponse, ChatMessage, ChatSession, ClarificationOption } from "../types";
import AssistantResponse from "./AssistantResponse";
import ChatComposer from "./ChatComposer";
import ClarificationPrompt from "./ClarificationPrompt";
import JobProgress from "./JobProgress";

const nearBottom = (node: HTMLElement) => node.scrollHeight - node.scrollTop - node.clientHeight < 96;

// eslint-disable-next-line react-refresh/only-export-components
export const getScrollMode = (initialized: boolean, shouldFollow: boolean) =>
  !initialized ? "auto" : shouldFollow ? "smooth" : "preserve";

export default function ChatList({
  selectedSession,
  messages,
  input,
  isLoading,
  isSending,
  isAnswering,
  statusText,
  error,
  sendDisabledReason,
  clarificationActive,
  clarificationMessage,
  clarificationOptions,
  onInputChange,
  onSend,
  onClarification,
}: {
  selectedSession: ChatSession | null;
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  isSending: boolean;
  isAnswering: boolean;
  statusText: string | null;
  error: string | null;
  sendDisabledReason: string | null;
  clarificationActive: boolean;
  clarificationMessage: string;
  clarificationOptions: ClarificationOption[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClarification: (value: ChatJobResponse) => void;
}) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const shouldFollow = useRef(true);
  const initialized = useRef(false);
  const [showLatest, setShowLatest] = useState(false);
  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior });
    shouldFollow.current = true;
    setShowLatest(false);
  };

  useLayoutEffect(() => {
    if (isLoading) return;
    const mode = getScrollMode(initialized.current, shouldFollow.current);
    initialized.current = true;
    if (mode === "preserve") setShowLatest(true);
    else {
      transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: mode });
      shouldFollow.current = true;
      setShowLatest(false);
    }
  }, [isLoading, messages, isSending, statusText]);

  return (
    <section aria-labelledby="chat-title" className="relative flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b px-1 pb-3">
        <h1 className="truncate text-lg font-semibold" id="chat-title">{selectedSession?.title || "Fineract AI"}</h1>
      </header>
      <div
        className="chat-transcript scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1 py-5"
        onScroll={(event) => {
          shouldFollow.current = nearBottom(event.currentTarget);
          if (shouldFollow.current) setShowLatest(false);
        }}
        ref={transcriptRef}
        tabIndex={0}
      >
        {isLoading && <p className="text-sm text-muted-foreground" role="status">Loading conversation…</p>}
        {!isLoading && messages.length === 0 && (
          <div className="mx-auto max-w-2xl py-10 text-center">
            <h2 className="text-xl font-semibold">Explore your Fineract data</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ask about deposits, loans, clients, branches, or portfolio summaries.</p>
          </div>
        )}
        {!isLoading && messages.length > 0 && (
          <ol aria-label="Conversation" className="mx-auto max-w-3xl space-y-7">
            {messages.map((message) => (
              <li className={cn(message.role === "user" && "flex justify-end")} key={message.id}>
                {message.role === "assistant" ? (
                  <article aria-label="Fineract AI response" className="chat-assistant-message text-sm leading-7">
                    <AssistantResponse message={message} />
                  </article>
                ) : (
                  <div className="chat-user-message max-w-[85%] rounded-2xl px-4 py-3 text-left text-sm leading-6">{message.content}</div>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="mx-auto mt-5 max-w-3xl space-y-3">
          <JobProgress active={isSending && statusText !== null && !clarificationActive} label={statusText} />
          {clarificationActive && (
            <ClarificationPrompt disabled={isAnswering} error={error} message={clarificationMessage} onSubmit={onClarification} options={clarificationOptions} />
          )}
          {error && !clarificationActive && <p className="chat-error rounded-lg px-3 py-2 text-sm" role="alert">{error}</p>}
        </div>
      </div>
      {showLatest && <Button className="absolute bottom-24 right-6" onClick={() => scrollToLatest()} size="sm" type="button" variant="secondary">Jump to latest</Button>}
      <ChatComposer disabled={isSending} disabledReason={sendDisabledReason} onChange={onInputChange} onSend={onSend} value={input} />
    </section>
  );
}
