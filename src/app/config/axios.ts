import axios, { type AxiosRequestConfig } from "axios";
import {
  ACCESS_TOKEN_KEY,
  API_BASE_URL,
  CHAT_ACTIVE_JOB_KEY,
  CHAT_API_KEY_KEY,
} from "./constants";
import { authService } from "@/module/auth/service";

export const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const url = config.url || "";
    const chatApiKey = sessionStorage.getItem(CHAT_API_KEY_KEY) || localStorage.getItem(CHAT_API_KEY_KEY);
    if (url.startsWith("/chat") && chatApiKey) {
      config.headers["X-API-Key"] = chatApiKey;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/** Marks a request config so we don't retry a refresh-token loop forever. */
type RetryableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;
let signInRedirectStarted = false;

/** Clear all locally stored auth/session data. */
const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(CHAT_API_KEY_KEY);
  sessionStorage.removeItem(CHAT_API_KEY_KEY);
  localStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
  sessionStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
};

/** Redirect to sign-in, preserving the page the user was on so we can return after login. */
const redirectToSignIn = () => {
  if (window.location.pathname === "/signin" || (signInRedirectStarted && window.location.href)) return;
  signInRedirectStarted = true;
  const returnPage = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.href = `/signin?returnPage=${returnPage}`;
};

/** Expire local state and send the user through the shared sign-in redirect. */
export const expireSession = () => {
  clearSession();
  redirectToSignIn();
};

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await authService.RefreshToken();
      const token = response.success ? response.data.access_token : null;
      if (!token) throw new Error(response.error?.message || "Failed to refresh token");
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      signInRedirectStarted = false;
      return token;
    } catch (error) {
      expireSession();
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url || "";

    // Only attempt a token refresh on 401 Unauthorized responses.
    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // The refresh endpoint itself failed: the session is unrecoverable.
    if (url.includes("/auth/refresh")) {
      expireSession();
      return Promise.reject(error);
    }

    // Never try to refresh on auth endpoints like login.
    if (url.includes("/auth/login") || url.includes("/auth/logout")) {
      return Promise.reject(error);
    }

    // Avoid retrying the same request more than once.
    if (originalRequest._retry) {
      expireSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };
      return instance(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
