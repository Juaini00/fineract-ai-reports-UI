

interface ApiErrorResponse {
  code: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error: ApiErrorResponse
}

export interface ApiRequestConfig extends Omit<import('axios').AxiosRequestConfig, 'url' | 'method'> {
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
  showToast?: { // Toast configuration
    loading?: string | boolean;
    success?: string | boolean;
    error?: string | boolean;
  };
  silent?: boolean; // Silent mode - no toast notifications
}

export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  data?: unknown;
  /** Axios error code, e.g. "ERR_BAD_REQUEST", "ECONNABORTED" */
  code?: string;
  /** Domain error code returned by the backend body, e.g. "unauthorized" */
  errorCode?: string;
  /** Whether `message` was extracted from the backend response body */
  hasServerMessage?: boolean;
}

export type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};
