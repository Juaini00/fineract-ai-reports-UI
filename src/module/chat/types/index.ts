export type ChatSession = {
  id: string;
  user_id: string | null;
  api_key_id: string | null;
  title: string | null;
  status: string;
  context_json: unknown;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  archived_at: string | null;
};

export type ChatMessageMetadata = {
  type?: string;
  assistant_response?: unknown;
  [key: string]: unknown;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  job_id: string | null;
  role: "user" | "assistant" | string;
  content: string;
  metadata_json: ChatMessageMetadata | null;
  created_at: string;
};

export type ChatJobStatus =
  | "queued"
  | "running"
  | "waiting_for_user_input"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export type ChatJobStep =
  | "queued"
  | "checking_context"
  | "embedding"
  | "taking_decision"
  | "authorizing"
  | "executing_query"
  | "shaping_result"
  | "formatting_response"
  | "response";

export type ActiveJobIdentity = { userId: string; sessionId: string; jobId: string };

export type ChatJobResult = {
  structured_response?: unknown;
  markdown?: string;
  [key: string]: unknown;
};

export type ChatJob = {
  job_id: string;
  session_id: string;
  user_message_id?: string;
  status: ChatJobStatus;
  current_step: ChatJobStep | string;
  state_json?: unknown;
  result_json?: ChatJobResult | null;
  error_json?: { message?: string } | null;
};

export type ChatJobResponse = { message: string; option_id?: string };

export type ClarificationOption =
  | string
  | {
      id: string;
      label?: string;
      capability_id?: string;
      title?: string;
      description?: string;
      [key: string]: unknown;
    };

export type ChatJobStatusEvent = {
  job_id: string;
  status: ChatJobStatus;
  current_step: ChatJobStep | string;
  [key: string]: unknown;
};

export type ChatStreamUpdate = {
  kind: "status" | "clarification" | "final" | "error" | (string & {});
  step: string;
  payload: {
    status?: string;
    message?: string;
    options?: ClarificationOption[];
    [key: string]: unknown;
  };
  at: string;
  [key: string]: unknown;
};

export type ChatStreamEventName = "status" | "update";
export type ChatStreamHandler = (event: ChatStreamEventName, data: ChatJobStatusEvent | ChatStreamUpdate) => void;

export type UseChatJobResult = {
  job: ChatJob | null;
  clarificationOptions: ClarificationOption[];
  clarificationMessage: string;
  error: string | null;
  statusLabel: string;
  isSendLocked: boolean;
  isAnswering: boolean;
  start(job: ChatJob): Promise<void>;
  answer(payload: ChatJobResponse): Promise<void>;
  recover(): Promise<void>;
  clear(): void;
};

const terminalJobStatuses: readonly ChatJobStatus[] = [
  "completed",
  "failed",
  "expired",
  "cancelled",
];

const activeJobStatuses: readonly ChatJobStatus[] = ["queued", "running", "waiting_for_user_input"];

export const isTerminalJobStatus = (value: unknown): value is ChatJobStatus =>
  typeof value === "string" && terminalJobStatuses.includes(value as ChatJobStatus);

export const isActiveJobStatus = (value: unknown): value is ChatJobStatus =>
  typeof value === "string" && activeJobStatuses.includes(value as ChatJobStatus);

export const isChatJobResponse = (value: unknown): value is ChatJobResponse =>
  typeof value === "object" &&
  value !== null &&
  (!("option_id" in value) || typeof (value as Record<string, unknown>).option_id === "string") &&
  typeof (value as Record<string, unknown>).message === "string";

export const normalizeClarificationOptions = (value: unknown): ClarificationOption[] =>
  Array.isArray(value)
    ? value.filter(
        (option): option is ClarificationOption =>
          typeof option === "string" ||
          (typeof option === "object" &&
            option !== null &&
            typeof (option as Record<string, unknown>).id === "string"),
      )
    : [];
