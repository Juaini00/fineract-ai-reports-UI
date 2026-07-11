import { ClipLoader, PulseLoader } from "react-spinners";
import { MessageCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface LoadingSpinnerProps {
  size?: number;
  variant?: "small" | "medium" | "large" | "page";
  message?: string;
  color?: string;
  className?: string;
}

export function LoadingSpinner({
  size,
  variant = "medium",
  message = "Loading...",
  color = "var(--primary)",
  className,
}: LoadingSpinnerProps) {
  const getSpinnerSize = () => {
    switch (variant) {
      case "small": return size || 18;
      case "medium": return size || 30;
      case "large": return size || 44;
      case "page": return size || 40;
      default: return size || 30;
    }
  };

  const getSpinnerComponent = () => {
    if (variant === "small") {
      return <PulseLoader color={color} size={6} margin={2} />;
    }
    return <ClipLoader color={color} size={getSpinnerSize()} speedMultiplier={0.85} />;
  };

  if (variant === "page") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          {/* Brand mark */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/15">
              <MessageCircle className="h-9 w-9 text-primary" />
              <span className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
              </span>
            </div>
            <div className="text-center">
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Fineract Chat
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your AI assistant for Fineract insights
              </p>
            </div>
          </div>

          {/* Spinner */}
          <div className="flex flex-col items-center gap-3">
            {getSpinnerComponent()}
            <p className="text-sm font-medium text-muted-foreground">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {getSpinnerComponent()}
      <span
        className={cn(
          "text-muted-foreground",
          variant === "small" ? "text-xs" : "text-sm",
        )}
      >
        {message}
      </span>
    </div>
  );
}

// Inline loading component for buttons
export function InlineLoading({
  message = "Loading...",
  color = "currentColor",
}: {
  message?: string;
  color?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <ClipLoader color={color} size={14} />
      <span>{message}</span>
    </span>
  );
}

// Card loading skeleton
export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-3/4 rounded-full bg-muted"></div>
      <div className="h-4 w-1/2 rounded-full bg-muted"></div>
      <div className="h-4 w-2/3 rounded-full bg-muted"></div>
    </div>
  );
}