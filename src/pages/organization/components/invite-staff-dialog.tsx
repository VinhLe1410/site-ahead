import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequestError } from "@/components/layout/request-error";

export function InviteStaffDialog({
  onReady,
}: {
  onReady: (invitation: Doc<"invitations">) => void;
}) {
  const create = useAction(api.invitationActions.create);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const invitation = await create({ email });
      setOpen(false);
      onReady(invitation);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create the invitation.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next);
          setEmail("");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button aria-label="Invite staff" />}>
        Invite staff
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            Staff can create, edit, and delete this organization’s jobs and
            categories. You must share the invitation link yourself.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <Field>
            <FieldLabel htmlFor="invite-email">Google account email</FieldLabel>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              required
            />
          </Field>
          {error !== null && <RequestError message={error} />}
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  disabled={pending}
                  aria-label="Cancel"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || email.trim().length === 0}
            >
              {pending ? "Creating..." : "Create invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
