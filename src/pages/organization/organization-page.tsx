import { useState } from "react";
import { useAction, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useMembership } from "@/components/auth/use-membership";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeading } from "@/components/layout/page-heading";
import { RequestError } from "@/components/layout/request-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RenameOrganizationDialog } from "./components/rename-organization-dialog";
import { InviteStaffDialog } from "./components/invite-staff-dialog";
import {
  CopyInvitationLink,
  InvitationReadyDialog,
} from "./components/invitation-link";

function InvitationRow({
  invitation,
  onReady,
}: {
  invitation: Doc<"invitations">;
  onReady: (invitation: Doc<"invitations">) => void;
}) {
  const revoke = useMutation(api.invitations.revoke);
  const renew = useAction(api.invitationActions.renew);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function renewInvitation() {
    setPending(true);
    setError(null);

    try {
      onReady(await renew({ invitationId: invitation._id }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not renew the invitation.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 border-t py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-medium">{invitation.email}</p>
        <p className="text-sm text-muted-foreground">
          {invitation.status === "expired"
            ? "Expired"
            : `Expires ${new Date(invitation.expiresAt).toLocaleString()}`}
        </p>
        {error !== null && <RequestError message={error} />}
      </div>
      <div className="flex flex-wrap gap-2">
        {invitation.status === "pending" ? (
          <>
            <CopyInvitationLink
              key={invitation.token}
              token={invitation.token}
            />
            <Button variant="ghost" onClick={() => onReady(invitation)}>
              Invitation details
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void renewInvitation()}
          >
            {pending ? "Renewing..." : "Renew"}
          </Button>
        )}
        <ConfirmDialog
          trigger="Revoke"
          title={`Revoke invitation for ${invitation.email}?`}
          description="This link will no longer let the recipient join your organization."
          confirmLabel="Revoke invitation"
          onConfirm={() => revoke({ invitationId: invitation._id })}
        />
      </div>
    </li>
  );
}

function InvitationList({
  status,
  onReady,
}: {
  status: "pending" | "expired";
  onReady: (invitation: Doc<"invitations">) => void;
}) {
  const invitations = usePaginatedQuery(
    api.invitations.list,
    { status },
    { initialNumItems: 20 },
  );

  return (
    <section>
      <h3 className="mb-2 font-medium">
        {status === "pending" ? "Pending invitations" : "Expired invitations"}
      </h3>
      {invitations.status === "LoadingFirstPage" ? (
        <p className="text-sm">Loading invitations...</p>
      ) : invitations.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {status} invitations.
        </p>
      ) : (
        <ul>
          {invitations.results.map((invitation) => (
            <InvitationRow
              key={invitation._id}
              invitation={invitation}
              onReady={onReady}
            />
          ))}
        </ul>
      )}
      {invitations.status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => invitations.loadMore(20)}>
          Load more invitations
        </Button>
      )}
      {invitations.status === "LoadingMore" && (
        <p className="text-sm">Loading more invitations...</p>
      )}
    </section>
  );
}

export function OrganizationPage() {
  const { organization, membership: currentMembership } = useMembership();

  const members = usePaginatedQuery(
    api.organizations.members,
    {},
    { initialNumItems: 20 },
  );

  const removeStaff = useMutation(api.organizations.removeStaff);

  const [readyInvitation, setReadyInvitation] =
    useState<Doc<"invitations"> | null>(null);

  return (
    <>
      <PageHeading
        title="Organization"
        description="Manage the organization name, staff, and invitation links."
      />
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-medium">{organization.name}</h2>
            <RenameOrganizationDialog name={organization.name} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Members</CardTitle>
            <InviteStaffDialog onReady={setReadyInvitation} />
          </CardHeader>
          <CardContent>
            {members.status === "LoadingFirstPage" ? (
              <p className="text-sm">Loading members...</p>
            ) : (
              <ul>
                {members.results.map(({ membership, name, email }) => (
                  <li
                    key={membership._id}
                    className="flex flex-col gap-3 border-t py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {name ?? email ?? "Member"}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">
                        {email ?? "No email available"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {membership.role === "owner" ? "Owner" : "Staff"}
                      </Badge>
                      {membership.userId === currentMembership.userId && (
                        <Badge variant="secondary">You</Badge>
                      )}
                      {membership.role === "staff" && (
                        <ConfirmDialog
                          trigger="Remove"
                          title={`Remove ${name ?? email ?? "this member"}?`}
                          description="Their organization access ends immediately. Shared jobs, inputs, categories, and checklists stay with the organization."
                          confirmLabel="Remove staff"
                          onConfirm={() =>
                            removeStaff({ membershipId: membership._id })
                          }
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {members.status === "CanLoadMore" && (
              <Button variant="outline" onClick={() => members.loadMore(20)}>
                Load more members
              </Button>
            )}
            {members.status === "LoadingMore" && (
              <p className="text-sm">Loading more members...</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <InvitationList status="pending" onReady={setReadyInvitation} />
            <InvitationList status="expired" onReady={setReadyInvitation} />
          </CardContent>
        </Card>
      </div>
      <InvitationReadyDialog
        invitation={readyInvitation}
        onClose={() => setReadyInvitation(null)}
      />
    </>
  );
}
