import { Loader2 } from "lucide-react";

export default function JobProgress({ label, active }: { label: string | null; active: boolean }) {
  if (!active) return null;
  return (
    <p aria-live="polite" aria-atomic="true" className="chat-assistant-work flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground" role="status">
      <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      {label || "Working on your request"}
    </p>
  );
}
