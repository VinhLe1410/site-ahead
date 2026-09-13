import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { AuthCard, AuthError, AuthPage } from "@/components/auth/auth-card";
import { AuthLoading } from "@/components/auth/auth-loading";
import { AccountControls } from "@/components/auth/account-controls";
import { normalizeReturnTo } from "@/components/auth/return-to";
import { Button } from "@/components/ui/button";

const unavailableMessages = {
  invalid: "This invitation link is invalid. Ask the owner for a new link.",
  verification_required:
    "Sign in again with Google to verify your email before accepting.",
  wrong_account:
    "This invitation is for a different Google account. Switch to the invited account to continue.",
  expired:
    "This invitation has expired. Ask the owner to renew it and share the new link.",
  revoked: "The owner revoked this invitation. Ask them for a new invitation.",
  declined: "You declined this invitation. Ask the owner for a new invitation.",
  used: "This invitation has already been used and cannot restore removed access. Ask the owner for a new invitation.",
  already_member:
    "You already belong to an organization. You can only join one organization.",
  joined:
    "You already joined this organization. Open its shared jobs to continue.",
};

function InvitationDetails({ token }: { token: string }) {
  const invitation = useQuery(api.invitations.lookup, { token });
  const accept = useMutation(api.invitations.accept);
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = new URLSearchParams(location.search).get("returnTo");

  const destination =
    returnTo === null ? "/app/jobs" : normalizeReturnTo(returnTo);

  async function join() {
    setPending(true);
    setError(null);

    try {
      await accept({ token });
      void navigate(destination, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not accept this invitation.",
      );
      setPending(false);
    }
  }

  if (invitation === undefined) return <AuthLoading />;

  return (
    <AuthPage>
      <AuthCard
        title={
          invitation.state === "pending"
            ? `Join ${invitation.organizationName}`
            : "Organization invitation"
        }
        description={
          invitation.state === "pending"
            ? "Join as staff to access this organization's jobs and categories."
            : unavailableMessages[invitation.state]
        }
      >
        <div className="space-y-5">
          <AuthError message={error} />
          {invitation.state === "pending" && (
            <Button disabled={pending} onClick={() => void join()}>
              {pending ? "Joining..." : "Join organization"}
            </Button>
          )}
          {invitation.state === "joined" ||
          invitation.state === "already_member" ? (
            <Button nativeButton={false} render={<Link to="/app/jobs" />}>
              Open jobs
            </Button>
          ) : (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/app/organization/new" />}
            >
              Organization setup
            </Button>
          )}
          <AccountControls allowSwitch />
        </div>
      </AuthCard>
    </AuthPage>
  );
}

export function AcceptInvitationPage() {
  const current = useQuery(api.organizations.current);
  const { token } = useParams();

  if (current === undefined) return <AuthLoading />;

  return <InvitationDetails token={token ?? ""} />;
}
