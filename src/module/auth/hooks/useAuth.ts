import { ACCESS_TOKEN_KEY, CHAT_ACTIVE_JOB_KEY, CHAT_API_KEY_KEY } from "@/app/config/constants";
import { authService } from "@/module/auth/service";
import type { User } from "@/module/auth/types";
import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

export const AUTH_QUERY_KEYS = {
  profile: ["auth", "profile"] as const,
} as const;

export const isProfileQueryEnabled = (token: string | null) => Boolean(token);

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User | null) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof localStorage !== "undefined" && typeof localStorage.getItem === "function" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null,
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CHAT_API_KEY_KEY);
    sessionStorage.removeItem(CHAT_API_KEY_KEY);
    localStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
    sessionStorage.removeItem(CHAT_ACTIVE_JOB_KEY);
    set({ token: null, user: null });
  },
}));

export function useAuth() {
  const queryClient = useQueryClient();
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const clearAuthAndQueries = useCallback(() => {
    clearAuth();
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["chat"] });
  }, [clearAuth, queryClient]);

  const profileQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.profile,
    queryFn: async () => {
      const result = await authService.GetMe();
      if (!result.success) throw new Error(result.error.message);
      const profile = authService.mapToUserProfile(result.data);
      if (token) setAuth(token, profile);
      return profile;
    },
    enabled: isProfileQueryEnabled(token),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearAuthAndQueries();
    },
  });

  useEffect(() => {
    if (profileQuery.error) {
      clearAuth();
      queryClient.removeQueries({ queryKey: ["chat"] });
    }
  }, [profileQuery.error, clearAuth, queryClient]);

  const currentUser = profileQuery.isError ? null : user ?? profileQuery.data ?? null;

  return {
    user: currentUser,
    isLoading: Boolean(token) && profileQuery.isLoading && !profileQuery.isError,
    isLoggedIn: Boolean(currentUser) && !profileQuery.isError,
    isAuthenticated: Boolean(token),
    error: profileQuery.error as Error | null,
    refetch: profileQuery.refetch,
    token,
    profileQuery,
    logoutMutation: logoutMutation,
    clearAuth: clearAuthAndQueries
  };
}
