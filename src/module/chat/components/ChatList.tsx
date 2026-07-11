import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { SendHorizontal } from "lucide-react";

type Conversation = { name: string };
type Message = { id: string; author: string; role: string; time: string; text: string };

const quickReplies = [
  "Share onboarding summary",
  "Ask for feedback",
  "Escalate to product ops",
];

export default function ChatList({ selectedConversation, messages }: { selectedConversation: Conversation; messages: Message[] }) {

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="flex h-full min-h-0 flex-col border-muted bg-white py-0">
        <CardHeader className=" pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <CardTitle className="font-semibold text-foreground">
              {selectedConversation.name}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-scroll pr-2">
            {messages.map((message) => (
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
                      {message.author}
                    </span>
                    <span>{message.time}</span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === "assistant"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply}
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  {reply}
                </Button>
              ))}
            </div>
            <div className="relative">
              <textarea
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                rows={3}
                placeholder="Draft a reply powered by Atlas..."
              />
              <Button
                size="icon"
                className="absolute bottom-3 right-3 rounded-full"
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
