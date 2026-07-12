export type ChatSession = {
  id: string;
  api_key_id: string;
  title: string | null;
  status: string;
  context_json: unknown;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  archived_at: string | null;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  job_id: string | null;
  role: "user" | "assistant" | string;
  content: string;
  metadata_json: unknown;
  created_at: string;
};

export type ChatJob = {
  job_id: string;
  session_id: string;
  user_message_id?: string;
  status: string;
  current_step: string;
  state_json?: unknown;
  result_json?: unknown;
  error_json?: { message?: string } | null;
};

export type ClarificationOption =
  | string
  | {
      id?: string;
      label?: string;
      capability_id?: string;
      title?: string;
      description?: string;
    };

export type ChatStreamUpdate = {
  kind: "status" | "clarification" | "final" | "error" | string;
  step?: string;
  payload?: {
    status?: string;
    message?: string;
    options?: ClarificationOption[];
  };
  at?: string;
};
