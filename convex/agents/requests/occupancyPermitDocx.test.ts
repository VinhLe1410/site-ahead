// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "vitest";
import { fillOccupancyPermitDocx } from "./occupancyPermitDocx";
import { occupancyPermitSkill } from "./occupancyPermitSkill";

const original = await readFile(
  "tests/fixtures/request-forms/Occupancy-residential-application.docx",
);

const word = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

test("fills saved address and consistent demo fields while preserving every other package part and original text", async () => {
  const output = await fillOccupancyPermitDocx(original, {
    addressText: "123 Collins Street, Melbourne VIC 3000",
  });

  const sourceParts = unzipSync(original);
  const draftParts = unzipSync(output.bytes);
  expect(Object.keys(draftParts).sort()).toEqual(
    Object.keys(sourceParts).sort(),
  );

  for (const [name, sourcePart] of Object.entries(sourceParts)) {
    if (name !== "word/document.xml")
      expect(draftParts[name]).toEqual(sourcePart);
  }

  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  const source = parser.parseFromString(
    strFromU8(sourceParts["word/document.xml"]),
    "application/xml",
  );

  const draft = parser.parseFromString(
    strFromU8(draftParts["word/document.xml"]),
    "application/xml",
  );

  const sourceText = Array.from(source.getElementsByTagNameNS(word, "t")).map(
    (node) => node.textContent,
  );

  const draftText = Array.from(draft.getElementsByTagNameNS(word, "t")).map(
    (node) => node.textContent,
  );

  for (const text of sourceText) expect(draftText).toContain(text);

  expect(draftText).toContain("123 Collins Street, Melbourne VIC 3000");
  expect(draftText).toContain("Ironbark Site Services");
  expect(draftText).toContain("J. Alvarez");
  expect(draftText).toContain("R. Kaur");
  expect(
    draftText.some((text) =>
      text?.includes(
        "No certificates or attachments have been obtained or verified",
      ),
    ),
  ).toBe(true);
  expect(
    output.fields.find((field) => field.field === "job_site_address")?.method,
  ).toBe("database");
  expect(
    output.fields.find((field) => field.field === "practitioner_name")?.method,
  ).toBe("demo_data");
  expect(
    serializer.serializeToString(
      draft.getElementsByTagNameNS(word, "sectPr")[0],
    ),
  ).toBe(
    serializer.serializeToString(
      source.getElementsByTagNameNS(word, "sectPr")[0],
    ),
  );
  expect(
    serializer.serializeToString(draft.getElementsByTagNameNS(word, "tbl")[0]),
  ).toBe(
    serializer.serializeToString(source.getElementsByTagNameNS(word, "tbl")[0]),
  );

  const overlays = Array.from(draft.getElementsByTagName("v:rect")).map(
    (element) => element.getAttribute("id"),
  );

  for (const field of occupancyPermitSkill.protectedFields)
    expect(overlays).not.toContain(`site_ahead_${field}`);

  expect(output.missingInformation.map((field) => field.field)).toEqual(
    expect.arrayContaining([
      "signature",
      "building_permit_number",
      "registrations_and_certificates",
      "recipient",
    ]),
  );
  expect(createHash("sha256").update(original).digest("hex")).toBe(
    occupancyPermitSkill.sourceSha256,
  );
  const qaDirectory = process.env.REQUEST_FORM_QA_DIRECTORY;

  if (qaDirectory)
    await writeFile(join(qaDirectory, "occupancy-draft.docx"), output.bytes);
});

test("uses confirmed details and safely escapes their literal XML characters", async () => {
  const output = await fillOccupancyPermitDocx(original, {
    addressText: "1 Smith & Jones Road",
    agentContext: {
      clientName: "A & B <Test>",
      contractorName: "Saved Builder",
    },
  });

  const xml = strFromU8(unzipSync(output.bytes)["word/document.xml"]);
  expect(xml).toContain("A &amp; B &lt;Test&gt;");
  expect(
    output.fields.find((field) => field.field === "applicant_name")?.method,
  ).toBe("database");
  expect(
    output.fields.find((field) => field.field === "practitioner_name")?.value,
  ).toBe("Saved Builder");
});

test("rejects unsupported source, missing address and values that cannot safely fit", async () => {
  await expect(
    fillOccupancyPermitDocx(new Uint8Array([...original, 0]), {
      addressText: "1 Road",
    }),
  ).rejects.toThrow("request_source_fingerprint_mismatch");
  await expect(
    fillOccupancyPermitDocx(original, { addressText: "" }),
  ).rejects.toThrow("request_site_address_missing");
  await expect(
    fillOccupancyPermitDocx(original, {
      addressText: "Long address ".repeat(30),
    }),
  ).rejects.toThrow("request_docx_value_overflow");
  await expect(
    fillOccupancyPermitDocx(original, { addressText: "1 Road\nMelbourne" }),
  ).rejects.toThrow("request_docx_value_not_renderable");
});
