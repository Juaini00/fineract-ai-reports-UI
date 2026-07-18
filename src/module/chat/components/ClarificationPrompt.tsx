import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { ChatJobResponse, ClarificationOption } from "../types";

function optionLabel(option: Exclude<ClarificationOption, string>) {
  return option.label?.trim() || option.description?.trim() || option.title?.trim() || option.id;
}

// eslint-disable-next-line react-refresh/only-export-components
export function clarificationPayload(option: ClarificationOption): ChatJobResponse | null {
  if (!option || typeof option === "string" || typeof option.id !== "string" || !option.id.trim() || option.id.length > 200) return null;
  return { option_id: option.id, message: optionLabel(option) };
}

// eslint-disable-next-line react-refresh/only-export-components
export function freeTextClarificationPayload(value: string): ChatJobResponse | null {
  const message = value.trim();
  return message && message.length <= 1000 ? { message } : null;
}

export default function ClarificationPrompt({
  options,
  disabled,
  error,
  message,
  onSubmit,
}: {
  options: ClarificationOption[];
  disabled: boolean;
  error: string | null;
  message: string;
  onSubmit: (payload: ChatJobResponse) => void;
}) {
  const validOptions = options.filter((option): option is Exclude<ClarificationOption, string> =>
    typeof option === "object" && option !== null && typeof option.id === "string" && Boolean(option.id.trim()) && option.id.length <= 200,
  );
  const [freeText, setFreeText] = useState("");

  return (
    <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <legend className="px-1 text-sm font-medium">Clarify your request</legend>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {validOptions.length > 0 && <div className="flex flex-wrap gap-2">
        {validOptions.map((option) => <Button className="min-h-10" key={option.id} type="button" variant="outline" disabled={disabled} onClick={() => {
          const payload = clarificationPayload(option);
          if (payload) onSubmit(payload);
        }}>{optionLabel(option)}</Button>)}
      </div>}
      {validOptions.length === 0 && <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => {
          event.preventDefault();
          const payload = freeTextClarificationPayload(freeText);
          if (payload) onSubmit(payload);
        }}>
          <label className="flex-1 text-sm" htmlFor="clarification-free-text">Your clarification
            <Input className="mt-1" id="clarification-free-text" maxLength={1000} value={freeText} disabled={disabled} onChange={(event) => setFreeText(event.target.value)} />
          </label>
          <Button className="min-h-10" type="submit" disabled={disabled || !freeText.trim()}>Submit clarification</Button>
        </form>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
