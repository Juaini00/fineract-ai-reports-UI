import axios from "axios";
import { ACCESS_TOKEN_KEY, API_BASE_URL, CHAT_ACTIVE_JOB_KEY, CHAT_API_KEY_KEY } from "./constants";
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
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });

  failedQueue = [];
};

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || "";

    if (status === 401) {
      return Promise.reject(error);
    }

    if (url.includes("/auth/refresh")) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      processQueue(error, null);

      const returnPage = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?returnPage=${returnPage}`;
      return Promise.reject(error);
    }

    if (url.includes("auth/signin")) {
      return Promise.resolve(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (!newToken) throw new Error("No token after refresh");
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        })
        .catch((error) => Promise.reject(error));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await authService.RefreshToken();

      if (!refreshResponse.success) {
        throw new Error("Failed fetch refresh token")
      }

      const newAccessToken = refreshResponse.data.access_token;
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return instance(originalRequest);
    } catch (error) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(CHAT_API_KEY_KEY);
      localStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
      processQueue(error, null)
      failedQueue = [];
      const returnPage = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `signin?rp=${returnPage}`
      return Promise.reject(error)
    } finally {
      isRefreshing = false;
    }

  },
);
