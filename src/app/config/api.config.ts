import type { ApiError, ApiRequestConfig } from "@/shared/types";
import { TOAST_MESSAGES } from "./constants";



/**
 * Get toast configuration with defaults
 * @param showToast - Toast configuration from request
 * @returns Normalized toast configuration
 */
export function getToastConfig(showToast?: ApiRequestConfig['showToast']) {
  if (!showToast) {
    return {
      loading: TOAST_MESSAGES.loading as string | false,
      success: TOAST_MESSAGES.success as string | false,
      error: true as string | boolean,
    };
  }

  return {
    loading: (showToast.loading === true
      ? TOAST_MESSAGES.loading
      : showToast.loading || false) as string | false,
    success: (showToast.success === true
      ? TOAST_MESSAGES.success
      : showToast.success || false) as string | false,
    // Keep the raw value: a custom string message, `true` (use default
    // resolution logic), or `false` (never toast on error).
    error: (showToast.error === undefined ? true : showToast.error) as
      | string
      | boolean,
  };
}

/**
 * Get appropriate fallback error message for toast based on status code.
 * Used only when the backend didn't return a usable message.
 * @param status - HTTP status code
 * @param defaultMessage - Default error message
 * @returns Error message for toast
 */
export function getErrorToastMessage(status?: number, defaultMessage?: string): string {
  switch (status) {
    case 401:
      return TOAST_MESSAGES.unauthorized;
    case 403:
      return TOAST_MESSAGES.forbidden;
    case 404:
      return TOAST_MESSAGES.notFound;
    case 422:
      return TOAST_MESSAGES.validationError;
    case 500:
    case 502:
    case 503:
    case 504:
      return TOAST_MESSAGES.serverError;
    default:
      if (!status) {
        return TOAST_MESSAGES.networkError;
      }
      return defaultMessage || TOAST_MESSAGES.error;
  }
}

/**
 * Resolve the final error toast message with the right priority:
 * 1. The real message returned by the backend (most accurate)
 * 2. The caller-provided custom message (e.g. showToast.error string)
 * 3. A generic, status-based fallback message
 * @param apiError - Formatted API error
 * @param customMessage - `showToast.error` value from the request config
 * @returns Message to display in the error toast
 */
export function resolveErrorToastMessage(
  apiError: ApiError,
  customMessage?: string | boolean,
): string {
  if (apiError.hasServerMessage && apiError.message) {
    return apiError.message;
  }
  if (typeof customMessage === "string") {
    return customMessage;
  }
  return getErrorToastMessage(apiError.status, apiError.message);
}