import { useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { getErrorMessage } from "../../../../shared/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { RequestError } from "@/components/layout/request-error";

function CertificateConfirmation({
  certificate,
  disabled,
}: {
  certificate: Doc<"electricalCertificates">;
  disabled: boolean;
}) {
  const confirm = useMutation(api.electricalDelivery.confirm);
  const download = useAction(api.electricalCertificateFiles.download);
  const [recipient, setRecipient] = useState(certificate.recipient ?? "");
  const [completed, setCompleted] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await confirm({
        itemId: certificate.itemId,
        certificateId: certificate._id,
        storageId: certificate.storageId,
        recipient,
        completedCertificateConfirmed: completed,
        simulationConfirmed: simulation,
      });
    } catch (cause) {
      setError(
        getErrorMessage(cause, "Could not confirm the certificate. Try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function downloadFile() {
    setSaving(true);

    try {
      const file = await download({ itemId: certificate.itemId });

      const url = URL.createObjectURL(
        new Blob([file.bytes], { type: "application/pdf" }),
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not download the certificate."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium wrap-anywhere">
          Uploaded: {certificate.filename}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => void downloadFile()}
        >
          Download uploaded PDF
        </Button>
      </div>
      <Field>
        <FieldLabel htmlFor={`recipient-${certificate.itemId}`}>
          Recipient email for the simulation
        </FieldLabel>
        <Input
          id={`recipient-${certificate.itemId}`}
          type="email"
          required
          value={recipient}
          disabled={disabled || saving}
          onChange={(event) => setRecipient(event.target.value)}
        />
      </Field>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`completed-${certificate.itemId}`}
          checked={completed}
          disabled={disabled || saving}
          onCheckedChange={setCompleted}
        />
        <label htmlFor={`completed-${certificate.itemId}`}>
          I confirm this is the completed COES for this job, rather than a
          draft.
        </label>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id={`simulation-${certificate.itemId}`}
          checked={simulation}
          disabled={disabled || saving}
          onCheckedChange={setSimulation}
        />
        <label htmlFor={`simulation-${certificate.itemId}`}>
          I confirm this recipient and understand this only simulates delivery.
          No email will be sent.
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        ESVConnect can email a completed COES to the customer when their email
        is supplied. Check existing delivery before arranging another copy
        outside this PoC.
      </p>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || saving || !completed || !simulation}
      >
        {saving ? "Please wait..." : "Confirm and simulate delivery"}
      </Button>
      {error && <RequestError message={error} />}
    </form>
  );
}

export function CertificateDeliveryControls({
  item,
  busy,
}: {
  item: Doc<"checklistItems">;
  busy: boolean;
}) {
  const certificate = useQuery(api.electricalDelivery.get, {
    itemId: item._id,
  });

  const upload = useAction(api.electricalCertificateFiles.upload);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = busy || item.status === "done";

  async function uploadFile(event: FormEvent) {
    event.preventDefault();

    if (!file) return;
    setSaving(true);
    setError(null);

    try {
      if (file.size > 2_000_000) throw new Error("Choose a PDF up to 2 MB.");
      await upload({
        itemId: item._id,
        filename: file.name,
        bytes: await file.arrayBuffer(),
      });
      setFile(null);
    } catch (cause) {
      setError(getErrorMessage(cause, "Could not upload the COES PDF."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="mt-3 space-y-4 rounded-md border p-3 text-sm sm:ml-8"
      aria-label="COES delivery simulation"
    >
      <p className="font-medium">PoC delivery simulation — no email is sent</p>
      <p className="text-muted-foreground">
        Upload the actual completed COES PDF, then explicitly confirm its
        recipient. The simulation does not verify certification, testing or
        inspection.
      </p>
      {item.status === "done" && !certificate?.simulatedAt && (
        <p>
          This item was marked done manually. No simulated or real delivery is
          recorded.
        </p>
      )}
      <form className="space-y-2" onSubmit={(event) => void uploadFile(event)}>
        <Field>
          <FieldLabel htmlFor={`certificate-${item._id}`}>
            {certificate
              ? "Replace uploaded COES PDF"
              : "Completed COES PDF (up to 2 MB)"}
          </FieldLabel>
          <Input
            id={`certificate-${item._id}`}
            type="file"
            accept="application/pdf,.pdf"
            disabled={disabled || saving}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={disabled || saving || !file}
        >
          {saving ? "Uploading..." : "Upload completed COES"}
        </Button>
      </form>
      {certificate && (
        <CertificateConfirmation
          key={`${certificate.storageId}:${certificate.confirmedAt ?? "unconfirmed"}`}
          certificate={certificate}
          disabled={disabled || saving}
        />
      )}
      {error && <RequestError message={error} />}
    </section>
  );
}
