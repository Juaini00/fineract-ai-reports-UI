export const API_BASE_URL = "http://localhost:3007";
export const LOCAL_ADMIN_TOKEN = "local-admin-token";
export const ACCESS_TOKEN_KEY = "access-token";

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
