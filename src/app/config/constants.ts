/**
 * Backend API base URL.
 *
 * The API host is derived from the browser's current hostname instead of a
 * hardcoded IP so the frontend origin and the backend origin are always
 * treated as the same "site" by the browser (e.g. both "localhost" or both
 * "127.0.0.1"). The refresh-token cookie is issued with `SameSite=Strict`,
 * which browsers will silently refuse to send/store across a host mismatch
 * (e.g. page on "localhost" calling an API on "127.0.0.1") even though both
 * resolve to the same loopback interface and CORS explicitly allows it.
 * Keeping both origins aligned is what actually lets the cookie flow.
 */
const API_PORT = "3007";
export const API_BASE_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:${API_PORT}`
    : `http://127.0.0.1:${API_PORT}`;
export const LOCAL_ADMIN_TOKEN = "local-admin-token";
export const ACCESS_TOKEN_KEY = "access-token";
export const CHAT_API_KEY_KEY = "chat-api-key";
export const CHAT_ACTIVE_JOB_KEY = "chat-active-job";

export const TOAST_MESSAGES = {
  loading: 'Loading...',
  success: 'Request completed successfully',
  error: 'Request failed. Please try again.',
  networkError: 'Network error. Please check your connection.',
  serverError: 'Server error. Please try again later.',
  unauthorized: 'You are not authorized to perform this action.',
  forbidden: 'Access denied.',
  notFound: 'Resource not found.',
  validationError: 'Please check your input and try again.',
} as const;
