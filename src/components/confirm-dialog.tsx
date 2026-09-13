import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void | null>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);

    try {
      await onConfirm();
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save this change. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" aria-label={trigger} />}>
        {trigger}
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
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
            variant="destructive"
            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending ? "Saving..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
