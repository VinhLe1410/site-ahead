import { useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestError } from "@/components/layout/request-error";

export function CopyInvitationLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);

    try {
      await navigator.clipboard.writeText(
        new URL(`/invite/${token}`, window.location.origin).href,
      );
      setCopied(true);
    } catch {
      setError(
        "Could not copy the link. Select and copy it from Invitation details.",
      );
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy link"}
      </Button>
      {error !== null && <RequestError message={error} />}
    </div>
  );
}

export function InvitationReadyDialog({
  invitation,
  onClose,
}: {
  invitation: Doc<"invitations"> | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={invitation !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitation ready</DialogTitle>
          <DialogDescription>
            Share this link manually. No email has been sent.
          </DialogDescription>
        </DialogHeader>
        {invitation !== null && (
          <div className="space-y-4">
            <p>Share with {invitation.email}.</p>
            <Field>
              <FieldLabel htmlFor="invitation-link">Invitation link</FieldLabel>
              <Input
                id="invitation-link"
                readOnly
                value={
                  new URL(`/invite/${invitation.token}`, window.location.origin)
                    .href
                }
                onFocus={(event) => event.target.select()}
              />
            </Field>
            <CopyInvitationLink
              key={invitation.token}
              token={invitation.token}
            />
            <p className="text-sm text-muted-foreground">
              Expires {new Date(invitation.expiresAt).toLocaleString()}.
            </p>
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button aria-label="Done" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
