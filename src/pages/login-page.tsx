import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useLocation } from "react-router";
import { AuthCard, AuthError, AuthPage } from "@/components/auth/auth-card";
import { normalizeReturnTo } from "@/components/auth/return-to";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  const { signIn } = useAuthActions();
  const location = useLocation();

  const returnTo = normalizeReturnTo(
    new URLSearchParams(location.search).get("returnTo"),
  );

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn("google", {
        redirectTo: new URL(returnTo, window.location.origin).href,
      });
    } catch {
      setError("Could not start Google login. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPage>
      <AuthCard
        title="Log in"
        description="Your first Google login creates an account."
      >
        <div className="flex flex-col gap-5">
          <AuthError message={error} />
          <Button
            disabled={isSubmitting}
            onClick={() => void handleGoogleSignIn()}
            type="button"
          >
            {isSubmitting ? "Opening Google..." : "Continue with Google"}
          </Button>
        </div>
      </AuthCard>
    </AuthPage>
  );
}
