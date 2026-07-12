import { apiGet, apiPost } from "@/shared/service/api.service";
import type { ApiResponse } from "@/shared/types";
import type { SignInValues } from "@/shared/validators/auth";
import type { AccessToken, AuthResponse, User } from "../types";



export const authService = {
  SignIn: async (credentials: SignInValues): Promise<ApiResponse<AuthResponse>> => {
    return await apiPost<ApiResponse<AuthResponse>, SignInValues>(
      {
        url: "/auth/login",
        showToast: {
          loading: "Signing in...",
          success: "Welcome! You have successfully signed in.",
          error: "Sign in failed. Please check your credentials.",
        },
      },
      credentials,
    );
  },
  Logout: async (): Promise<ApiResponse<null>> => {
    return await apiPost<ApiResponse<null>>(
      {
        url: "/auth/logout",
        showToast: {
          loading: "Signing out...",
          success: "You have successfully signed out.",
          error: "Sign out failed. Please try again.",
        },
      },
    );
  },
  GetMe: async (): Promise<ApiResponse<User>> => {
    return await apiGet<ApiResponse<User>>(
      {
        url: "/auth/me",
        showToast: {
          loading: "Fetching user data...",
          error: "Failed to fetch user data.",
        },
      },
    );
  },
  RefreshToken: async (): Promise<ApiResponse<AccessToken>> => {
    return await apiPost<ApiResponse<AccessToken>>(
      {
        url: "/auth/refresh",
        showToast: {
          loading: "Refreshing session...",
          success: "Session refreshed successfully.",
          error: "Failed to refresh session.",
        },
      },
    );
  },
  mapToUserProfile: (user: User): User => user,
  logout: async (): Promise<ApiResponse<null>> => authService.Logout(),
};
