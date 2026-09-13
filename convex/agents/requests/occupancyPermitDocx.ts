"use node";

import { createHash } from "node:crypto";
import {
  DOMParser,
  XMLSerializer,
  type Document,
  type Element,
} from "@xmldom/xmldom";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  occupancyPermitSkill,
  occupancyPermitValues,
} from "./occupancyPermitSkill";
import type { RequestJob } from "./requestProfile";

const word = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const vml = "urn:schemas-microsoft-com:vml";

// Direct body child index and local x position are pinned to the inspected
// source fingerprint. Every existing paragraph, shape, tab and table survives.
const slots = {
  applicant_name: { paragraph: 8, x: 247, width: 299 },
  postal_address: { paragraph: 9, x: 74, width: 317 },
  postal_postcode: { paragraph: 9, x: 451, width: 90 },
  contact_name: { paragraph: 10, x: 74, width: 317 },
  contact_phone: { paragraph: 10, x: 449, width: 92 },
  contact_email: { paragraph: 11, x: 30, width: 361 },
  job_site_address: { paragraph: 17, x: 96, width: 444 },
  practitioner_name: { paragraph: 25, x: 31, width: 212 },
  practitioner_registration: { paragraph: 25, x: 513, width: 34 },
  designer_name: { paragraph: 26, x: 31, width: 212 },
  designer_category: { paragraph: 26, x: 331, width: 83 },
  proposed_use: { paragraph: 34, x: 319, width: 104 },
};

function addTextBox(
  document: Document,
  paragraph: Element,
  name: string,
  text: string,
  x: number,
  width: number,
) {
  const run = document.createElementNS(word, "w:r");
  const picture = document.createElementNS(word, "w:pict");
  const box = document.createElementNS(vml, "v:rect");
  box.setAttribute("id", `site_ahead_${name}`);
  box.setAttribute(
    "style",
    `position:absolute;margin-left:${x}pt;margin-top:-1.5pt;width:${width}pt;height:13pt;z-index:251700000;mso-position-horizontal-relative:text;mso-position-vertical-relative:text`,
  );
  box.setAttribute("stroked", "f");
  box.setAttribute("filled", "f");
  const textBox = document.createElementNS(vml, "v:textbox");
  textBox.setAttribute("inset", "0,0,0,0");
  const content = document.createElementNS(word, "w:txbxContent");
  const textParagraph = document.createElementNS(word, "w:p");
  const paragraphProperties = document.createElementNS(word, "w:pPr");
  const spacing = document.createElementNS(word, "w:spacing");
  spacing.setAttributeNS(word, "w:before", "0");
  spacing.setAttributeNS(word, "w:after", "0");
  spacing.setAttributeNS(word, "w:line", "240");
  spacing.setAttributeNS(word, "w:lineRule", "exact");
  paragraphProperties.appendChild(spacing);
  textParagraph.appendChild(paragraphProperties);
  const textRun = document.createElementNS(word, "w:r");
  const properties = document.createElementNS(word, "w:rPr");
  const fonts = document.createElementNS(word, "w:rFonts");
  fonts.setAttributeNS(word, "w:ascii", "Arial");
  fonts.setAttributeNS(word, "w:hAnsi", "Arial");
  const size = document.createElementNS(word, "w:sz");
  size.setAttributeNS(word, "w:val", "18");
  const color = document.createElementNS(word, "w:color");
  color.setAttributeNS(word, "w:val", "10385F");
  properties.appendChild(fonts);
  properties.appendChild(size);
  properties.appendChild(color);
  textRun.appendChild(properties);
  const textElement = document.createElementNS(word, "w:t");
  textElement.setAttribute("xml:space", "preserve");
  textElement.appendChild(document.createTextNode(text));
  textRun.appendChild(textElement);
  textParagraph.appendChild(textRun);
  content.appendChild(textParagraph);
  textBox.appendChild(content);
  box.appendChild(textBox);
  picture.appendChild(box);
  run.appendChild(picture);
  paragraph.appendChild(run);
}

export async function fillOccupancyPermitDocx(
  source: Uint8Array,
  job: RequestJob,
) {
  const sourceSha256 = createHash("sha256").update(source).digest("hex");

  if (sourceSha256 !== occupancyPermitSkill.sourceSha256)
    throw new Error("request_source_fingerprint_mismatch");
  const parts = unzipSync(source);
  const documentPart = parts["word/document.xml"];

  if (!documentPart) throw new Error("request_docx_layout_unsupported");

  const document = new DOMParser({
    onError: () => {
      throw new Error("request_docx_parse_failed");
    },
  }).parseFromString(strFromU8(documentPart), "application/xml");

  const body = document.getElementsByTagNameNS(word, "body")[0];

  if (!body) throw new Error("request_docx_layout_unsupported");

  const elements = Array.from(body.childNodes).filter(
    (node): node is Element =>
      node.nodeType === 1 &&
      (node.localName === "p" || node.localName === "tbl"),
  );

  if (
    elements.length !== 50 ||
    document.getElementsByTagNameNS(word, "sdt").length !== 0
  )
    throw new Error("request_docx_layout_unsupported");
  const values = occupancyPermitValues(job);
  const metricsDocument = await PDFDocument.create();
  // Arial and Helvetica share the Latin metrics used here. Preserve the source
  // Arial at 9pt, reject unsupported glyphs, and verify actual Word rendering.
  const metrics = await metricsDocument.embedFont(StandardFonts.Helvetica);

  for (const field of values.fields) {
    const slot = Object.entries(slots).find(
      ([name]) => name === field.field,
    )?.[1];

    if (!slot) throw new Error("request_docx_field_unsupported");
    let width: number;

    try {
      if (
        Array.from(field.value).some(
          (character) => character.charCodeAt(0) < 32,
        )
      )
        throw new Error();
      width = metrics.widthOfTextAtSize(field.value, 9);
    } catch {
      throw new Error("request_docx_value_not_renderable");
    }

    if (width > slot.width - 4) throw new Error("request_docx_value_overflow");
    addTextBox(
      document,
      elements[slot.paragraph],
      field.field,
      field.value,
      slot.x,
      slot.width,
    );
  }

  addTextBox(
    document,
    elements[3],
    "demo_label",
    "SITE AHEAD DEMO DRAFT - Fictional general details; unsigned and not submitted",
    0,
    550,
  );
  addTextBox(
    document,
    elements[38],
    "demo_label_page_2",
    "DEMO DRAFT - No certificates or attachments have been obtained or verified by Site Ahead.",
    0,
    550,
  );
  addTextBox(
    document,
    elements[43],
    "recipient_review",
    "Confirm the preprinted Boroondara council/surveyor applies to this site before using this form.",
    0,
    550,
  );
  parts["word/document.xml"] = strToU8(
    new XMLSerializer().serializeToString(document),
  );

  return { ...values, sourceSha256, bytes: zipSync(parts) };
}
