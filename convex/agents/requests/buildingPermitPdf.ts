"use node";

import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  buildingPermitSkill,
  buildingPermitValues,
} from "./buildingPermitSkill";
import type { RequestJob } from "./requestProfile";

// Coordinates belong only to the verified original Form 1 fingerprint. `top`
// uses the source's top-left coordinates; overlays cover only dotted blanks.
const boxes = {
  job_site_address: { x: 121, top: 306, width: 360 },
  applicant_name: { x: 223, top: 155, width: 258 },
  postal_address: { x: 96, top: 166, width: 208 },
  postal_postcode: { x: 349, top: 166, width: 130 },
  contact_name: { x: 100, top: 177, width: 208 },
  contact_phone: { x: 354, top: 177, width: 125 },
  contact_email: { x: 69, top: 188, width: 235 },
  service_address: { x: 203, top: 209, width: 201 },
  service_postcode: { x: 449, top: 209, width: 31 },
  service_contact: { x: 106, top: 231, width: 231 },
  service_phone: { x: 390, top: 231, width: 88 },
  builder_name: { x: 67, top: 391, width: 247 },
  builder_phone: { x: 358, top: 391, width: 113 },
  builder_address: { x: 73, top: 402, width: 240 },
  builder_postcode: { x: 358, top: 402, width: 113 },
  builder_email: { x: 300, top: 413, width: 173 },
  practitioner_name: { x: 67, top: 455, width: 153 },
  builder_registration: { x: 418, top: 455, width: 61 },
  designer_name: { x: 67, top: 497, width: 153 },
  designer_category: { x: 274, top: 497, width: 80 },
  proposed_use: { x: 148, top: 603, width: 322 },
  contract_price: { x: 377, top: 677, width: 95 },
};

export async function fillBuildingPermitPdf(
  source: Uint8Array,
  job: RequestJob,
) {
  const sourceSha256 = createHash("sha256").update(source).digest("hex");

  if (sourceSha256 !== buildingPermitSkill.sourceSha256)
    throw new Error("request_source_fingerprint_mismatch");
  const pdf = await PDFDocument.load(source);
  const pages = pdf.getPages();

  if (pages.length !== 2 || pdf.getForm().getFields().length !== 0)
    throw new Error("request_pdf_layout_unsupported");
  const page = pages[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const values = buildingPermitValues(job);

  for (const field of values.fields) {
    const box = Object.entries(boxes).find(
      ([name]) => name === field.field,
    )?.[1];

    if (!box) throw new Error("request_pdf_field_unsupported");
    const fontSize = 8;
    let width: number;

    try {
      if (
        Array.from(field.value).some(
          (character) => character.charCodeAt(0) < 32,
        )
      )
        throw new Error();
      width = font.widthOfTextAtSize(field.value, fontSize);
    } catch {
      throw new Error("request_pdf_value_not_renderable");
    }

    if (width > box.width - 4) throw new Error("request_pdf_value_overflow");
    const widget = pdf.getForm().createTextField(field.field);
    widget.setText(field.value);
    widget.addToPage(page, {
      x: box.x,
      y: page.getHeight() - box.top - 11,
      width: box.width,
      height: 11,
      font,
      borderWidth: 0,
      backgroundColor: rgb(1, 1, 1),
      textColor: rgb(0.04, 0.19, 0.38),
    });
    widget.setFontSize(fontSize);
    widget.disableScrolling();
    widget.updateAppearances(font);
  }

  for (const [index, draftPage] of pages.entries()) {
    // An annotation is independent of clipping left by the source's page-2
    // graphics stream. It stays visible without rewriting original content.
    const label = pdf.getForm().createTextField(`demo_label_${index + 1}`);
    label.setText(
      "SITE AHEAD DEMO DRAFT - Fictional general details; human review required",
    );
    label.addToPage(draftPage, {
      x: 43,
      y: draftPage.getHeight() - 18,
      width: 510,
      height: 12,
      font: bold,
      borderWidth: 0,
      backgroundColor: rgb(1, 1, 1),
      textColor: rgb(0.04, 0.19, 0.38),
    });
    label.setFontSize(8);
    label.enableReadOnly();
    label.updateAppearances(bold);
  }

  page.drawText(
    "Original council: Central Goldfields. Confirm jurisdiction, all demo details and human fields before use.",
    {
      x: 43,
      y: 45,
      size: 7,
      font,
      color: rgb(0.04, 0.19, 0.38),
    },
  );
  pdf.setTitle("DEMO DRAFT - Application for a Building Permit");
  pdf.setSubject(
    "Fictional general profile; actual saved job site. Unsigned and not submitted.",
  );

  return { ...values, sourceSha256, bytes: await pdf.save() };
}
