import { useState, type FormEvent } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AuthCard, AuthError, AuthPage } from "@/components/auth/auth-card";
import { AuthLoading } from "@/components/auth/auth-loading";
import { AccountControls } from "@/components/auth/account-controls";
import { OrganizationMaintenance } from "@/components/auth/organization-maintenance";
import { normalizeReturnTo, withReturnTo } from "@/components/auth/return-to";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function OrganizationForm({
  removed,
  destination,
  onCreating,
}: {
  removed: boolean;
  destination: string;
  onCreating: () => void;
}) {
  const user = useQuery(api.users.currentUser);

  const invitations = usePaginatedQuery(
    api.invitations.pendingForMe,
    {},
    { initialNumItems: 20 },
  );

  const create = useMutation(api.organizations.create);
  const decline = useMutation(api.invitations.decline);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    onCreating();

    try {
      await create({ name });
      void navigate(destination, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create the organization.",
      );
      setPending(false);
    }
  }

  async function declineInvitation(invitationId: Id<"invitations">) {
    setPending(true);
    setError(null);

    try {
      await decline({ invitationId });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not decline the invitation.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPage>
      <AuthCard
        title={
          removed ? "Organization access removed" : "Create your organization"
        }
        description={
          removed
            ? "Your shared work stays with the organization. Create your own organization or accept a new invitation."
            : "Create an organization to manage shared jobs and categories, or accept an invitation below."
        }
      >
        <div className="space-y-6">
          {user !== undefined && user.googleEmailVerified !== true && (
            <p role="status" className="text-sm">
              Sign in again with Google to check and accept invitations for your
              verified email.
            </p>
          )}
          <section className="space-y-3" aria-label="Your invitations">
            {invitations.status === "LoadingFirstPage" ? (
              <p className="text-sm">Checking invitations...</p>
            ) : invitations.results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending invitations.
              </p>
            ) : (
              <>
                <h2 className="font-medium">Your invitations</h2>
                {invitations.results.map(({ invitation, organizationName }) => (
                  <div
                    key={invitation._id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <p className="font-medium">{organizationName}</p>
                    <p className="text-sm text-muted-foreground">
                      Join as staff. Expires{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString()}.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        nativeButton={false}
                        render={
                          <Link
                            to={withReturnTo(
                              `/invite/${invitation.token}`,
                              destination,
                            )}
                          />
                        }
                        disabled={pending}
                      >
                        Review invitation
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={pending}
                        onClick={() => void declineInvitation(invitation._id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {invitations.status === "CanLoadMore" && (
              <Button
                variant="outline"
                onClick={() => invitations.loadMore(20)}
              >
                Load more invitations
              </Button>
            )}
            {invitations.status === "LoadingMore" && (
              <p className="text-sm">Loading invitations...</p>
            )}
          </section>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <Field>
              <FieldLabel htmlFor="organization-name">
                Organization name
              </FieldLabel>
              <Input
                id="organization-name"
                autoComplete="organization"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={pending}
              />
            </Field>
            <AuthError message={error} />
            <Button
              type="submit"
              disabled={
                pending ||
                user === undefined ||
                invitations.status === "LoadingFirstPage" ||
                name.trim().length === 0
              }
            >
              {pending ? "Saving..." : "Create organization"}
            </Button>
          </form>
          <AccountControls allowSwitch />
        </div>
      </AuthCard>
    </AuthPage>
  );
}

export function CreateOrganizationPage() {
  const current = useQuery(api.organizations.current);
  const location = useLocation();
  const [creating, setCreating] = useState(false);

  const requested = normalizeReturnTo(
    new URLSearchParams(location.search).get("returnTo"),
  );

  const destination =
    new URL(requested, window.location.origin).pathname
      .replace(/\/+$/, "")
      .toLowerCase() === "/app/organization/new"
      ? "/app/jobs"
      : requested;

  if (current === undefined) return <AuthLoading />;

  if (current.state === "maintenance") return <OrganizationMaintenance />;

  if (current.state === "active")
    return <Navigate to={creating ? destination : "/app/jobs"} replace />;

  return (
    <OrganizationForm
      removed={current.state === "removed"}
      destination={destination}
      onCreating={() => setCreating(true)}
    />
  );
}
