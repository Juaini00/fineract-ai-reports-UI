import { useAuth } from "@/module/auth/hooks";
import { LoadingSpinner } from "@/shared/components/ui/loading";
import { Navigate } from "react-router-dom";

export default function PublicRoute({
  element,
}: {
  element: React.ReactElement;
}) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner variant="page" message="Checking authentication..." />;
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return element;
}
