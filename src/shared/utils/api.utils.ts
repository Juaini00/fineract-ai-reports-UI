import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types';

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Type guard to check if error is an Axios error
 * @param error - Error object
 * @returns Boolean indicating if it's an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Shape of the error field the backend may return, e.g.
 * `{ success: false, data: null, error: { code: "unauthorized", message: "..." } }`
 */
type BackendErrorBody = {
  code?: string;
  message?: string;
};

/**
 * Try to pull a domain error code (e.g. "unauthorized") out of the response body
 * @param error - Axios error object
 * @returns Domain error code, if present
 */
export function extractErrorCode(error: AxiosError): string | undefined {
  if (!error.response?.data) return undefined;
  const data = error.response.data as Record<string, unknown>;

  if (data.error && typeof data.error === 'object') {
    const nested = data.error as BackendErrorBody;
    if (typeof nested.code === 'string') return nested.code;
  }
  if (typeof data.code === 'string') return data.code;
  return undefined;
}

/**
 * Extract error message from Axios error
 * @param error - Axios error object
 * @returns Error message
 */
export function extractErrorMessage(error: AxiosError): string {
  // Try to get message from response data
  if (error.response?.data) {
    const data = error.response.data as Record<string, unknown>;

    // Common error message fields
    if (typeof data.message === 'string') return data.message;

    // Nested error object, e.g. { error: { code, message } }
    if (data.error && typeof data.error === 'object') {
      const nested = data.error as BackendErrorBody;
      if (typeof nested.message === 'string') return nested.message;
    }
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.msg === 'string') return data.msg;

    // Handle validation errors
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map((err: unknown) => {
        if (typeof err === 'string') return err;
        if (typeof err === 'object' && err !== null && 'message' in err) {
          return String((err as { message: unknown }).message);
        }
        return String(err);
      }).join(', ');
    }
  }

  // Fallback to default axios message
  return error.message || 'Request failed';
}

/**
 * Format API error object
 * @param error - Raw error object
 * @param method - HTTP method
 * @param url - Request URL
 * @returns Formatted error object
 */
export function formatApiError(error: unknown, method: string, url: string): ApiError {
  console.error(`❌ ${method} ${url} failed:`, error);

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const data = error.response?.data;
    const message = extractErrorMessage(error);
    const errorCode = extractErrorCode(error);

    return {
      message,
      status,
      statusText,
      data,
      code: error.code,
      errorCode,
      hasServerMessage: Boolean(error.response?.data),
    };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      message: (error as { message: string }).message,
    };
  }

  return {
    message: `${method} request failed with unknown error`,
  };
}