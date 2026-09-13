import {
  ironbarkDemoProfile as demo,
  requestField,
  savedSiteField,
  type RequestJob,
  type RequestValues,
} from "./requestProfile";

export const occupancyPermitSkill = {
  key: "occupancy-inspection-request",
  name: "Carpentry Occupancy Permit draft",
  useDescription:
    "Use for a Carpentry residential/building occupancy-permit application using the pinned Boroondara general-building Form 15 DOCX. Never use the superseded prescribed-temporary-structure form. This draft is not an occupancy permit or final-inspection certificate.",
  sourceSha256:
    "d133220bd897180b694e17486ee5bc297fd8a49842b6e93fd371ed85360516e0",
  contentType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  sourceFilename: "Occupancy-residential-application.docx",
  fillingGuidance:
    "Read the saved job and this exact pinned source before filling. Keep original Form 15 title, Boroondara contact details, named surveyor, statutory choices, certificate text and signatures unchanged. The inspected file has paragraph-anchored dotted-line drawings and tab blanks, not content controls: add editable text overlays anchored only to supported paragraphs without shifting existing layout. Put the full jobs.addressText verbatim beside Property details. Saved client and contractor details take precedence over the fixed Ironbark general profile; mark defaults demo_data. Do not guess property identifiers, a council, building-permit number, practitioner registration, BCA classification, certificate/attachment, signature or signing date. Add visible demo/unsigned and unverified-attachments annotations, save a new draft, list human confirmations, then stop waiting. Never send or submit.",
  trustedMappings: {
    job_site_address: "jobs.addressText (required, no fallback)",
    applicant_name: "jobs.agentContext.clientName or Ironbark demo applicant",
    contact_phone: "jobs.agentContext.contractorPhone or Ironbark demo phone",
    contact_email: "jobs.agentContext.contractorEmail or Ironbark demo email",
    practitioner_name:
      "jobs.agentContext.contractorName or Ironbark demo company",
    practitioner_registration:
      "jobs.agentContext.contractorLicence only; otherwise blank",
  },
  requiredFields: ["job_site_address", "applicant_name"],
  protectedFields: [
    "signature",
    "signing_date",
    "building_permit_number",
    "statutory_choices",
    "application_checkboxes",
    "bca_class",
    "certificates",
    "attachments",
  ],
} as const;

export function occupancyPermitValues(job: RequestJob): RequestValues {
  const context = job.agentContext;

  const fields = [
    savedSiteField(job),
    requestField(
      "applicant_name",
      "Applicant name",
      context?.clientName,
      demo.applicantName,
      "jobs.agentContext.clientName",
    ),
    requestField(
      "postal_address",
      "Applicant postal address",
      undefined,
      demo.postalAddress,
      "",
    ),
    requestField(
      "postal_postcode",
      "Applicant postcode",
      undefined,
      demo.postcode,
      "",
    ),
    requestField(
      "contact_name",
      "Contact person",
      undefined,
      demo.contactName,
      "",
    ),
    requestField(
      "contact_phone",
      "Contact telephone",
      context?.contractorPhone,
      demo.phone,
      "jobs.agentContext.contractorPhone",
    ),
    requestField(
      "contact_email",
      "Contact email",
      context?.contractorEmail,
      demo.email,
      "jobs.agentContext.contractorEmail",
    ),
    requestField(
      "practitioner_name",
      "Building practitioner",
      context?.contractorName,
      demo.companyName,
      "jobs.agentContext.contractorName",
    ),
    requestField(
      "designer_name",
      "Designer name",
      undefined,
      demo.designerName,
      "",
    ),
    requestField(
      "designer_category",
      "Designer category (demo)",
      undefined,
      demo.designerCategory,
      "",
    ),
    requestField(
      "proposed_use",
      "Proposed residential use (demo)",
      undefined,
      "Single dwelling",
      "",
    ),
  ];

  if (context?.contractorLicence?.trim())
    fields.push(
      requestField(
        "practitioner_registration",
        "Contractor-supplied registration",
        context.contractorLicence,
        "",
        "jobs.agentContext.contractorLicence",
      ),
    );

  return {
    fields,
    missingInformation: [
      {
        field: "recipient",
        label: "Council and surveyor suitability",
        reason:
          "The original form names Boroondara and Asanka Kodikara. Confirm the recipient, jurisdiction and appointment for this saved site; they have not been verified.",
      },
      {
        field: "building_permit_number",
        label: "Building permit number",
        reason:
          "An actual issued building-permit reference requires human confirmation; both source blanks remain empty.",
      },
      {
        field: "property_identifiers",
        label: "Property details",
        reason:
          "The full saved site address is shown. Confirm component address fields, council, title, plan and land identifiers yourself.",
      },
      {
        field: "application_choices",
        label: "Application basis and building use",
        reason:
          "Confirm Section 42/54, application type, building part, proposed use, BCA class and public-entertainment choices; no statutory declaration or checkbox is selected.",
      },
      {
        field: "registrations_and_certificates",
        label: "Practitioners, certificates and attachments",
        reason:
          "Demo names do not establish registration or appointment. The original certificate sentence is preprinted; Site Ahead has not obtained or verified any certificate or attachment.",
      },
      {
        field: "signature",
        label: "Applicant signature and signing date",
        reason:
          "Deliberately blank for the applicant after all information and supporting evidence have been confirmed.",
      },
    ],
    nextAction:
      "Review the demo draft, confirm Boroondara/surveyor suitability, replace fictional general details, supply the real permit and supporting evidence, complete application choices and sign yourself. Nothing has been submitted.",
  };
}
