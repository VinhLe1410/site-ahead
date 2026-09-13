import { getErrorMessage } from "../../../../shared/errors";
import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DOCUMENT_ACCEPT } from "../../../../shared/documents";
import { useDocumentTransfer } from "@/components/documents/use-document-transfer";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function DocumentUploadDialog({
  documentId = null,
}: {
  documentId?: Id<"documents"> | null;
}) {
  const { upload } = useDocumentTransfer();
  const navigate = useNavigate();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replacing = documentId !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (file === null) return;
    setPending(true);
    setError(null);

    try {
      const savedId = await upload(file, title, description, documentId);

      setOpen(false);

      if (!replacing) void navigate(`/app/library/${savedId}`);
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not upload this document. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        setTitle("");
        setDescription("");
        setFile(null);
        setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={replacing ? "outline" : "default"}
            aria-label={replacing ? "Replace file" : "Upload document"}
          />
        }
      >
        {replacing ? "Replace file" : "Upload document"}
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>
            {replacing ? "Replace document file" : "Upload document"}
          </DialogTitle>
          <DialogDescription>
            {replacing
              ? "New jobs will use this version. Existing jobs keep their assigned files."
              : "Share reusable guidance or a blank form with your organization."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          {!replacing && (
            <>
              <Field>
                <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
                <Input
                  id={`${id}-title`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-description`}>
                  Description
                </FieldLabel>
                <Textarea
                  id={`${id}-description`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={pending}
                />
              </Field>
            </>
          )}
          <Field>
            <FieldLabel htmlFor={`${id}-file`}>File</FieldLabel>
            <Input
              id={`${id}-file`}
              type="file"
              accept={DOCUMENT_ACCEPT}
              onChange={(event) => setFile(event.target.files?.item(0) ?? null)}
              disabled={pending}
              required
            />
            <FieldDescription>
              PDF or Word (.pdf, .doc, .docx). Up to 10 MB.
            </FieldDescription>
          </Field>
          {error !== null && <RequestError message={error} />}
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
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
              disabled={
                pending ||
                file === null ||
                (!replacing && title.trim().length === 0)
              }
            >
              {pending
                ? "Uploading..."
                : replacing
                  ? "Upload new version"
                  : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
