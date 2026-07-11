import { authService } from "@/module/auth/service";
import { SignInSchema, type SignInValues } from "@/shared/validators/auth";
import type { ApiError, ApiResponse } from "@/shared/types";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { AuthResponse } from "../types";
import { useAuthStore } from "@/module/auth/hooks";

export const useSignInMutation = (returnPage?: string | null) => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<ApiResponse<AuthResponse>, ApiError, SignInValues>({
    mutationFn: async (credentials: SignInValues) => {
      const body = SignInSchema.parse(credentials);
      const result = await authService.SignIn(body);

      if (!result.success) {
        throw new Error(result.error.message || "Sign in failed");
      }

      setAuth(result.data.access_token, result.data.user);
      return result;
    },
    onSuccess: () => {
      const target = returnPage ? decodeURIComponent(returnPage) : "/";
      navigate(target, { replace: true });
    },
  });
};
