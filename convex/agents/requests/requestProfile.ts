import type { Doc } from "../../_generated/dataModel";

export type RequestJob = {
  addressText: string;
  agentContext?: Pick<
    NonNullable<Doc<"jobs">["agentContext"]>,
    | "clientName"
    | "contractorName"
    | "contractorPhone"
    | "contractorEmail"
    | "contractorLicence"
    | "plannedStartDate"
  >;
};

export type RequestField = {
  field: string;
  label: string;
  value: string;
  method: "database" | "demo_data";
  reference: string;
};

export type RequestMissingField = {
  field: string;
  label: string;
  reason: string;
};

export type RequestValues = {
  fields: RequestField[];
  missingInformation: RequestMissingField[];
  nextAction: string;
};

// This profile is authorized only for labeled request drafts. It is never saved
// as confirmed job context and is not imported by automated evidence tools.
export const ironbarkDemoProfile = {
  name: "Ironbark demonstration profile v1",
  applicantName: "J. Alvarez",
  companyName: "Ironbark Site Services",
  contactName: "M. Novak",
  postalAddress: "PO Box 100 (demo), Melbourne",
  postcode: "3000",
  phone: "03 5550 0100",
  email: "requests@ironbark.example",
  designerName: "R. Kaur",
  designerCategory: "DP-DD",
  proposedUse: "Single dwelling (unchanged) - demo",
  contractPrice: "34,500 (demo, incl. GST)",
} as const;

export function requestField(
  field: string,
  label: string,
  confirmed: string | undefined,
  fallback: string,
  reference: string,
): RequestField {
  const saved = confirmed?.trim();

  return {
    field,
    label,
    value: saved || fallback,
    method: saved ? "database" : "demo_data",
    reference: saved ? reference : ironbarkDemoProfile.name,
  };
}

export function savedSiteField(job: RequestJob): RequestField {
  if (!job.addressText.trim()) throw new Error("request_site_address_missing");

  return {
    field: "job_site_address",
    label: "Saved job site address",
    value: job.addressText,
    method: "database",
    reference: "jobs.addressText",
  };
}
