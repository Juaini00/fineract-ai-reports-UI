import { useAuth } from "@/module/auth/hooks";
import { LoadingSpinner } from "@/shared/components/ui/loading";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  element,
}: {
  element: React.ReactElement;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <LoadingSpinner variant="page" message="Checking authentication..." />
    );
  }

  if (!isAuthenticated) {
    
    return <Navigate to="/signin" replace />;
  }

  return element;
}
