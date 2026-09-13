import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useLocation, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { AuthError } from "./auth-card";
import { locationReturnTo, withReturnTo } from "./return-to";
import { Button } from "@/components/ui/button";

export function AccountControls({
  allowSwitch = false,
}: {
  allowSwitch?: boolean;
}) {
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout(switchAccount: boolean) {
    setPending(true);
    setError(null);

    const destination = switchAccount
      ? withReturnTo("/login", locationReturnTo(location))
      : "/";

    try {
      await signOut();
      void navigate(destination, { replace: true });
    } catch {
      setError("Could not log out. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        {user === undefined ? "Loading account..." : user.email}
      </p>
      <div className="flex flex-wrap gap-2">
        {allowSwitch && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void logout(true)}
          >
            Use a different account or sign in again
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => void logout(false)}
        >
          {pending ? "Logging out..." : "Log out"}
        </Button>
      </div>
      <AuthError message={error} />
    </div>
  );
}
