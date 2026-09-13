import { getErrorMessage } from "../../../shared/errors";
import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentDownload } from "@/components/documents/document-download";
import { PageHeading } from "@/components/layout/page-heading";
import { RequestError } from "@/components/layout/request-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DocumentUploadDialog } from "./components/document-upload-dialog";

function DocumentDetailsForm({ document }: { document: Doc<"documents"> }) {
  const update = useMutation(api.documents.update);
  const id = useId();
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await update({ documentId: document._id, title, description });
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Could not save document details. Try again."),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
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
        <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
        <Textarea
          id={`${id}-description`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </Field>
      {error !== null && <RequestError message={error} />}
      <Button type="submit" disabled={pending || title.trim().length === 0}>
        {pending ? "Saving..." : "Save details"}
      </Button>
    </form>
  );
}

export function LibraryDocumentPage() {
  const { documentId } = useParams();
  const data = useQuery(api.documents.get, { documentId: documentId ?? "" });
  const archive = useMutation(api.documents.archive);

  if (data === undefined)
    return <p className="text-sm text-muted-foreground">Loading document...</p>;

  if (data === null)
    return (
      <>
        <PageHeading
          title="Document not found"
          description="This document does not exist or you cannot access it."
        />
        <Link to="/app/library" className="underline">
          Back to Library
        </Link>
      </>
    );
  const { document, version, uploader } = data;

  const fileSize =
    version.size < 1_000
      ? `${version.size} bytes`
      : version.size < 1_000_000
        ? `${(version.size / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} KB`
        : `${(version.size / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} MB`;

  return (
    <>
      <PageHeading
        title={document.title}
        description={document.description}
        action={
          document.archived ? (
            <Badge variant="secondary">Archived</Badge>
          ) : (
            <DocumentUploadDialog documentId={document._id} />
          )
        }
      />
      {document.archived && (
        <p className="mb-4 text-sm text-muted-foreground">
          This document is archived. Existing jobs can still download their
          assigned versions.
        </p>
      )}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="break-words font-medium">{version.filename}</p>
            <p className="text-sm text-muted-foreground">
              Version {version.number} · {fileSize}
            </p>
            <p className="text-sm text-muted-foreground">
              Uploaded {new Date(version._creationTime).toLocaleString()}
              {uploader !== null && ` by ${uploader}`}
            </p>
          </div>
          <DocumentDownload version={version} />
        </CardContent>
      </Card>
      {!document.archived && (
        <div className="space-y-6">
          <Card>
            <CardContent>
              <DocumentDetailsForm key={document._id} document={document} />
            </CardContent>
          </Card>
          <ConfirmDialog
            trigger="Archive document"
            title={`Archive ${document.title}?`}
            description="Existing jobs keep their files. Templates using this document must be updated before new jobs can be created."
            confirmLabel="Archive document"
            onConfirm={() => archive({ documentId: document._id })}
          />
        </div>
      )}
    </>
  );
}
