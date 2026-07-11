import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>

          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>

          <h2 className="text-2xl font-semibold text-foreground mb-3">
            Page Not Found
          </h2>

          <p className="text-muted-foreground mb-8">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>

          <Separator className="mb-6" />

          <div className="space-y-3">
            <Button className="w-full" size="lg">
              <Link
                to="/"
                className="flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              onClick={handleGoBack}
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
