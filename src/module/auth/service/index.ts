import { apiGet, apiPost } from "@/shared/service/api.service";
import type { ApiResponse } from "@/shared/types";
import type { SignInValues } from "@/shared/validators/auth";
import type { AccessToken, AuthResponse, CreateApiKeyPayload, CreatedApiKey, User } from "../types";



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
        silent: true,
      },
    );
  },
  RefreshToken: async (): Promise<ApiResponse<AccessToken>> => {
    return await apiPost<ApiResponse<AccessToken>>(
      {
        url: "/auth/refresh",
        silent: true,
      },
    );
  },
  CreateApiKey: async (payload: CreateApiKeyPayload): Promise<ApiResponse<CreatedApiKey>> => {
    return await apiPost<ApiResponse<CreatedApiKey>, CreateApiKeyPayload>(
      {
        url: "/auth/api-keys",
        showToast: {
          loading: "Creating chat key...",
          success: "Chat key connected.",
          error: "Failed to create chat key.",
        },
      },
      payload,
    );
  },
  mapToUserProfile: (user: User): User => user,
  logout: async (): Promise<ApiResponse<null>> => authService.Logout(),
};
