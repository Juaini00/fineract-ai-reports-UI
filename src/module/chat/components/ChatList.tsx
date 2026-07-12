import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { HelpCircle, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatMessage, ChatSession, ClarificationOption } from "../types";

function optionValue(option: ClarificationOption, index: number) {
  return typeof option === "string" ? option : option.id || option.capability_id || option.label || String(index + 1);
}

function optionLabel(option: ClarificationOption, index: number) {
  return typeof option === "string" ? option : option.label || option.title || option.capability_id || `Option ${index + 1}`;
}

export default function ChatList({
  selectedSession,
  messages,
  input,
  isLoading,
  isSending,
  statusText,
  error,
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
  statusText: string | null;
  error: string | null;
  clarificationOptions: ClarificationOption[];
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClarification: (value: string) => void;
}) {
  const disabled = isSending || !selectedSession;
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending, clarificationOptions.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="flex h-full min-h-0 flex-col border-muted bg-white py-0">
        <CardHeader className=" pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <CardTitle className="font-semibold text-foreground">
              {selectedSession?.title || "Fineract chat"}
            </CardTitle>
            {statusText && <span className="text-xs text-muted-foreground">{statusText}</span>}
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2 scroll-smooth">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={cn("flex gap-3", index % 2 && "flex-row-reverse")}>
                  <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                  <div className="max-w-xl flex-1 space-y-2">
                    <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-16 animate-pulse rounded-2xl bg-muted" />
                  </div>
                </div>
              ))}

            {!isLoading && messages.length === 0 && (
              <div className="rounded-2xl bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                Start with a question about your Fineract data.
              </div>
            )}

            {!isLoading && messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse text-right",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    message.role === "assistant"
                      ? "bg-primary/90 text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {message.role === "assistant" ? "A" : "J"}
                </div>
                <div className="max-w-xl space-y-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground",
                      message.role === "user" && "flex-row-reverse",
                    )}
                  >
                    <span className="font-medium text-foreground">
                      {message.role === "assistant" ? "AI" : "You"}
                    </span>
                    <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === "assistant"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            {isSending && clarificationOptions.length === 0 && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="max-w-xl rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-foreground shadow-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    AI is thinking
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusText || "Preparing your answer..."}
                  </p>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
            {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            {clarificationOptions.length > 0 && (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
                <div className="mb-3 flex items-start gap-2 text-sm text-foreground">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">AI needs your confirmation</p>
                    <p className="text-xs text-muted-foreground">Choose one option to continue this same job.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {clarificationOptions.map((option, index) => (
                    <Button
                      key={optionValue(option, index)}
                      size="sm"
                      variant="outline"
                      className="cursor-pointer rounded-full bg-background transition-all duration-200 hover:scale-[1.02]"
                      onClick={() => onClarification(optionValue(option, index))}
                      type="button"
                    >
                      {index + 1}. {optionLabel(option, index)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="relative">
              <textarea
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                rows={3}
                placeholder="Ask about loans, deposits, clients, or reports..."
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
                disabled={disabled}
              />
              <Button
                size="icon"
                className="absolute bottom-3 right-3 cursor-pointer rounded-full transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={disabled || !input.trim()}
                onClick={onSend}
                type="button"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
