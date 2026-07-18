import { useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export type ComposerKeyAction = "send" | "newline" | "none";

// eslint-disable-next-line react-refresh/only-export-components
export const composerKeyAction = (key: string, shiftKey: boolean, isComposing: boolean): ComposerKeyAction =>
  key !== "Enter" ? "none" : shiftKey || isComposing ? "newline" : "send";

export default function ChatComposer({
  value,
  disabled,
  disabledReason,
  onChange,
  onSend,
}: {
  value: string;
  disabled: boolean;
  disabledReason: string | null;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div className="chat-composer shrink-0 border-t bg-card pt-3">
      {disabledReason && <p className="chat-disabled-reason mb-2 rounded-lg px-3 py-2 text-sm" id="chat-disabled-reason">{disabledReason}</p>}
      <div className="relative">
        <textarea
          ref={textareaRef}
          aria-describedby={disabledReason ? "chat-disabled-reason" : undefined}
          aria-label="Message Fineract AI"
          className="min-h-12 max-h-40 w-full resize-none rounded-xl border bg-background py-3 pl-4 pr-28 text-sm leading-6 shadow-sm focus-visible:outline-none"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (composerKeyAction(event.key, event.shiftKey, event.nativeEvent.isComposing) === "send") {
              event.preventDefault();
              if (value.trim() && !disabled) onSend();
            }
          }}
          placeholder="Ask about your Fineract data…"
          maxLength={1000}
          rows={1}
          value={value}
        />
        <Button className="absolute bottom-2 right-2 min-h-10" disabled={disabled || !value.trim()} onClick={onSend} type="button">
          <SendHorizontal aria-hidden="true" className="size-4" />
          Send message
        </Button>
      </div>
    </div>
  );
}
