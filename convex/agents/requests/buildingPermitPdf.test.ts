// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { fillBuildingPermitPdf } from "./buildingPermitPdf";
import { buildingPermitSkill } from "./buildingPermitSkill";
import type { RequestJob } from "./requestProfile";

const original = await readFile(
  "tests/fixtures/request-forms/BUILDING-PERMIT-APPLICATION.pdf",
);

const job: RequestJob = {
  addressText: "123 Collins Street, Melbourne VIC 3000",
};

test("fills the actual source with editable appearances, saved site, demo provenance and blank human areas", async () => {
  const before = createHash("sha256").update(original).digest("hex");
  const output = await fillBuildingPermitPdf(original, job);
  const draft = await PDFDocument.load(output.bytes);
  expect(draft.getPageCount()).toBe(2);
  expect(draft.getForm().getTextField("job_site_address").getText()).toBe(
    job.addressText,
  );
  expect(draft.getForm().getTextField("builder_name").getText()).toBe(
    "Ironbark Site Services",
  );
  expect(
    output.fields.find((field) => field.field === "job_site_address"),
  ).toMatchObject({ method: "database", reference: "jobs.addressText" });
  expect(
    output.fields.find((field) => field.field === "builder_name"),
  ).toMatchObject({ method: "demo_data" });

  for (const field of draft.getForm().getFields()) {
    expect(field.isReadOnly()).toBe(field.getName().startsWith("demo_label_"));
    expect(field.acroField.getWidgets()).toHaveLength(1);
    expect(field.acroField.getWidgets()[0].dict.has(PDFName.of("AP"))).toBe(
      true,
    );
  }

  const names = draft
    .getForm()
    .getFields()
    .map((field) => field.getName());

  for (const protectedField of buildingPermitSkill.protectedFields)
    expect(names).not.toContain(protectedField);
  expect(names).not.toContain("builder_registration");
  expect(output.missingInformation.map((field) => field.field)).toEqual(
    expect.arrayContaining([
      "signature",
      "jurisdiction",
      "registrations",
      "work_confirmation",
    ]),
  );
  expect(createHash("sha256").update(original).digest("hex")).toBe(before);
  expect(output.sourceSha256).toBe(before);
  expect((await PDFDocument.load(original)).getForm().getFields()).toHaveLength(
    0,
  );
  const qaDirectory = process.env.REQUEST_FORM_QA_DIRECTORY;

  if (qaDirectory)
    await writeFile(join(qaDirectory, "building-draft.pdf"), output.bytes);
});

test("confirmed saved contacts take precedence while model-like extra fields cannot become input", async () => {
  const withContext: RequestJob = {
    ...job,
    agentContext: {
      contractorName: "Confirmed Builder",
      contractorEmail: "saved@example.com",
      clientName: "Confirmed Applicant",
    },
  };

  const output = await fillBuildingPermitPdf(original, withContext);
  const draft = await PDFDocument.load(output.bytes);
  expect(draft.getForm().getTextField("builder_name").getText()).toBe(
    "Confirmed Builder",
  );
  expect(draft.getForm().getTextField("applicant_name").getText()).toBe(
    "Confirmed Applicant",
  );
  expect(
    output.fields.find((field) => field.field === "builder_email")?.method,
  ).toBe("database");
  expect(draft.getForm().getTextField("job_site_address").getText()).toBe(
    job.addressText,
  );
});

test("rejects changed source bytes and absent site instead of using an invented site", async () => {
  await expect(
    fillBuildingPermitPdf(new Uint8Array([...original, 0]), job),
  ).rejects.toThrow("request_source_fingerprint_mismatch");
  await expect(
    fillBuildingPermitPdf(original, { addressText: " " }),
  ).rejects.toThrow("request_site_address_missing");
});

test("rejects clipped, multiline or unrenderable values explicitly", async () => {
  await expect(
    fillBuildingPermitPdf(original, {
      addressText: "Long address ".repeat(30),
    }),
  ).rejects.toThrow("request_pdf_value_overflow");
  await expect(
    fillBuildingPermitPdf(original, {
      addressText: "123 Collins Street\nMelbourne",
    }),
  ).rejects.toThrow("request_pdf_value_not_renderable");
  await expect(
    fillBuildingPermitPdf(original, { addressText: "123 Collins Street 🏠" }),
  ).rejects.toThrow("request_pdf_value_not_renderable");
});
