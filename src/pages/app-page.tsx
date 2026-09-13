import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { AuthError } from "@/components/auth/auth-card";

export function AppPage() {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
      void navigate("/", { replace: true });
    } catch {
      setError("Could not log out. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-xl bg-background p-6 shadow-sm ring-1 ring-foreground/10">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="mt-1 break-all font-medium">
            {user === undefined ? "Loading account..." : user.email}
          </p>
        </div>
        <Button disabled={isSigningOut} onClick={() => void handleSignOut()}>
          {isSigningOut ? "Logging out..." : "Log out"}
        </Button>
        {error !== null && (
          <div className="w-full">
            <AuthError message={error} />
          </div>
        )}
      </div>
    </main>
  );
}
