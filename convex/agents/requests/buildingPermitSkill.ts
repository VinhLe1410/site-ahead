import {
  ironbarkDemoProfile as demo,
  requestField,
  savedSiteField,
  type RequestJob,
  type RequestValues,
} from "./requestProfile";

export const buildingPermitSkill = {
  key: "building-permit-request",
  name: "Carpentry Building Permit draft",
  useDescription:
    "Use for a Carpentry building-permit application request using the pinned Central Goldfields Form 1 PDF. This creates a demo application draft, never an issued permit or surveyor appointment.",
  sourceSha256:
    "2fd75884548db85482db07afc6e9c4df161e3625c7220294f08c7d07c9484c09",
  contentType: "application/pdf",
  sourceFilename: "BUILDING-PERMIT-APPLICATION.pdf",
  fillingGuidance:
    "Read the saved job and this exact pinned source before filling. Preserve the original title, council, statutory notes and all office-use content. Add editable PDF overlay fields to the known blank areas. Put the entire jobs.addressText verbatim beside Property details; do not infer parcel identifiers or substitute the demo mailing address. Saved clientName and contractor contact details take precedence over the fixed Ironbark general profile. Label all defaults demo_data. Never infer a signature, signing date, declaration, licence, approval, certificate, payment or attachment. Leave protected fields blank and report them for human confirmation. Keep the original Central Goldfields council text and explicitly require jurisdiction review. Reject values that cannot fit at readable size. Save a new demo draft, leave the checklist pending, and stop for human review; never send or submit.",
  trustedMappings: {
    job_site_address: "jobs.addressText (required, no fallback)",
    applicant_name: "jobs.agentContext.clientName or Ironbark demo applicant",
    builder_name: "jobs.agentContext.contractorName or Ironbark demo company",
    builder_phone: "jobs.agentContext.contractorPhone or Ironbark demo phone",
    builder_email: "jobs.agentContext.contractorEmail or Ironbark demo email",
    builder_registration:
      "jobs.agentContext.contractorLicence only; otherwise blank for confirmation",
  },
  requiredFields: ["job_site_address", "applicant_name", "builder_name"],
  protectedFields: [
    "signature",
    "signing_date",
    "levy_payment",
    "office_use",
    "declarations",
    "approval_references",
    "attachments",
  ],
} as const;

export function buildingPermitValues(job: RequestJob): RequestValues {
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
      "service_address",
      "Address for service",
      undefined,
      demo.postalAddress,
      "",
    ),
    requestField(
      "service_postcode",
      "Address for service postcode",
      undefined,
      demo.postcode,
      "",
    ),
    requestField(
      "service_contact",
      "Service contact person",
      undefined,
      demo.contactName,
      "",
    ),
    requestField(
      "service_phone",
      "Service telephone",
      context?.contractorPhone,
      demo.phone,
      "jobs.agentContext.contractorPhone",
    ),
    requestField(
      "builder_name",
      "Builder name",
      context?.contractorName,
      demo.companyName,
      "jobs.agentContext.contractorName",
    ),
    requestField(
      "builder_phone",
      "Builder telephone",
      context?.contractorPhone,
      demo.phone,
      "jobs.agentContext.contractorPhone",
    ),
    requestField(
      "builder_address",
      "Builder postal address",
      undefined,
      demo.postalAddress,
      "",
    ),
    requestField(
      "builder_postcode",
      "Builder postcode",
      undefined,
      demo.postcode,
      "",
    ),
    requestField(
      "builder_email",
      "Builder email",
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
      "Proposed use (demo)",
      undefined,
      demo.proposedUse,
      "",
    ),
    requestField(
      "contract_price",
      "Illustrative contract price",
      undefined,
      demo.contractPrice,
      "",
    ),
  ];

  if (context?.contractorLicence?.trim())
    fields.push(
      requestField(
        "builder_registration",
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
        field: "jurisdiction",
        label: "Council / form suitability",
        reason:
          "The original form names Central Goldfields. Confirm this council and form apply to the saved site; no jurisdiction has been verified.",
      },
      {
        field: "property_identifiers",
        label: "Property identifiers and address components",
        reason:
          "The full saved site address is shown beside Property details. Confirm number/street/locality, title, lot, plan and land details with the contractor.",
      },
      {
        field: "work_confirmation",
        label: "Work, contract and applicant capacity",
        reason:
          "Confirm the illustrative dwelling use and $34,500 contract; select applicant capacity, nature of work, owner-builder status and contract declaration yourself.",
      },
      {
        field: "registrations",
        label: "Practitioner registrations and supporting evidence",
        reason:
          "Confirm applicable practitioner registrations, approvals, certificates, attachments and any required insurance. Demo names do not establish appointment or registration.",
      },
      {
        field: "signature",
        label: "Applicant signature and signing date",
        reason:
          "Must be completed by the applicant after reviewing all values; deliberately blank.",
      },
      {
        field: "payment_and_office",
        label: "Levy, payments and office use",
        reason:
          "Confirm levy responsibility and payments outside Site Ahead. Office-use fields and receipt dates are untouched.",
      },
    ],
    nextAction:
      "Review this demo draft, replace or confirm every fictional general value, verify Central Goldfields form suitability, complete the listed human fields and sign yourself. Nothing has been submitted.",
  };
}
