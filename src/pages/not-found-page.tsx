import { Link } from "react-router";
import { AuthCard, AuthPage } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <AuthPage>
      <AuthCard title="Page not found">
        <Button nativeButton={false} render={<Link to="/app" />}>
          Go to the app
        </Button>
      </AuthCard>
    </AuthPage>
  );
}
