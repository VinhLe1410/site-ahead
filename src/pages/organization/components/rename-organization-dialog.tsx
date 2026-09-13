import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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

export function RenameOrganizationDialog({ name }: { name: string }) {
  const rename = useMutation(api.organizations.rename);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await rename({ name: value });
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not rename the organization.",
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
          setValue(name);
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" aria-label="Edit name" />}
      >
        Edit name
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Edit organization name</DialogTitle>
          <DialogDescription>
            Everyone in the organization will see this name.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <Field>
            <FieldLabel htmlFor="edit-organization-name">
              Organization name
            </FieldLabel>
            <Input
              id="edit-organization-name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
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
              disabled={pending || value.trim().length === 0}
            >
              {pending ? "Saving..." : "Save name"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
