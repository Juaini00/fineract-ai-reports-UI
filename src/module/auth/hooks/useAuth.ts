import { ACCESS_TOKEN_KEY } from "@/app/config/constants";
import { authService } from "@/module/auth/service";
import type { User } from "@/module/auth/types";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";

export const AUTH_QUERY_KEYS = {
  profile: ["auth", "profile"] as const,
} as const;

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User | null) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(ACCESS_TOKEN_KEY),
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    set({ token: null, user: null });
  },
}));

export function useAuth() {
  const queryClient = useQueryClient();
  const { token, user, setAuth, clearAuth } = useAuthStore();

  const profileQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.profile,
    queryFn: async () => {
      const result = await authService.GetMe();
      if (!result.success) throw new Error(result.error.message);
      const profile = authService.mapToUserProfile(result.data);
      if (token) setAuth(token, profile);
      return profile;
    },
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearAuth();
      queryClient.removeQueries({ queryKey: ["auth"] });
    },
  });

  useEffect(() => {
    if (profileQuery.error) clearAuth();
  }, [profileQuery.error, clearAuth]);

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
    clearAuth: clearAuth
  };
}
