import type { Infer } from "convex/values";
import type { ItemContext } from "../../jobAgentContext";
import type { electricalRequestDraftValidator } from "../../electricalContracts";
import {
  classifyElectricalScope,
  ELECTRICAL_RULE_SOURCE,
  electricalRequestKind,
} from "../../../shared/electrical";

export const COES_GUIDE =
  "https://www.energysafe.vic.gov.au/sites/default/files/2024-11/Quick-Reference-Guide-V5.1.pdf";

export const COES_FUNDAMENTALS =
  "https://www.energysafe.vic.gov.au/sites/default/files/2025-07/COES_Fundamentals_Jan-2024.pdf";

export const ESV_CONNECT =
  "https://portal.energysafe.vic.gov.au/prweb/ESVConnect/";

export const LEI_REGISTER =
  "https://www.energysafe.vic.gov.au/licensing/search-public-register";

export const electricalRequestSkills = [
  {
    key: "lei-booking",
    name: "Licensed Electrical Inspector booking email",
    guidance:
      "Use only when the saved detailed scope satisfies the supported prescribed-work rule. Prepare an email for a human-chosen inspector using saved facts and conspicuous missing placeholders. This is an enquiry, never a confirmed booking or sent email. There is no standard inspector booking form. Never invent a recipient, licence, inspection date, completed test, certificate reference or access arrangement. Read the scoped job, select this skill, prepare through the trusted mapping tool, then save and wait.",
  },
  {
    key: "coes-portal",
    name: "COES information for ESVConnect",
    guidance:
      "Prepare saved reference information and only verified portal labels from official public ESV guidance. Description of work is for actual completed electrical work: leave it missing until the electrician supplies and certifies the actual work. Show planned scope as reference only, never as completed work. Customer email may be copied from confirmed saved context. Never invent licence numbers, test results, declarations, signatures, dates or certificate references. No portal automation, submission or certification. Read the scoped job, select this skill, prepare through the trusted mapping tool, then save and wait.",
  },
] as const;

type Draft = Infer<typeof electricalRequestDraftValidator>;

type Missing = { field: string; label: string; reason: string };

type PreparedElectricalRequest = {
  draft: Draft | null;
  missingInformation: Missing[];
  nextAction: string;
};

function field(
  field: string,
  label: string,
  value: string | undefined,
  source: string,
  portalLabelVerified = false,
): Draft["fields"][number] {
  return {
    field,
    label,
    value: value?.trim() || null,
    source,
    portalLabelVerified,
  };
}

export function prepareElectricalRequest(
  context: ItemContext,
  now: number,
): PreparedElectricalRequest {
  const kind = electricalRequestKind(context.item.title);

  if (kind === null || context.item.kind !== "third_party")
    throw new Error("electrical_request_item_mismatch");
  const scope = classifyElectricalScope(context.input.processedText);

  if (kind === "lei-booking" && scope.classification !== "prescribed")
    return {
      draft: null,
      missingInformation: [
        {
          field: "electrical_scope",
          label: "Prescribed-work scope",
          reason:
            scope.classification === "non_prescribed"
              ? "The supported saved scope is non-prescribed; a prescribed-work inspector booking is not applicable. Confirm any additional work with the electrician."
              : scope.reason,
        },
      ],
      nextAction:
        scope.classification === "non_prescribed"
          ? "This prescribed-work booking is not applicable to the supported non-prescribed scope. Review and record the appropriate manual outcome."
          : scope.reason,
    };
  const saved = context.job.agentContext;

  const references = [
    field(
      "site_address",
      kind === "coes-portal" ? "Address" : "Saved site address",
      context.job.addressText,
      "jobs.addressText; ESV COES Fundamentals p6",
      kind === "coes-portal",
    ),
    field(
      "planned_scope",
      "Planned scope — reference only",
      context.input.processedText,
      "inputs.processedText",
    ),
    field(
      "contractor_name",
      "Saved contractor name",
      saved?.contractorName,
      "jobs.agentContext.contractorName",
    ),
    field(
      "contractor_licence",
      "Contractor-confirmed licence",
      saved?.contractorLicence,
      "jobs.agentContext.contractorLicence",
    ),
  ];

  const fields =
    kind === "coes-portal"
      ? [
          field(
            "customer_email",
            "Customer email",
            saved?.clientEmail,
            "jobs.agentContext.clientEmail; ESV COES Fundamentals p4",
            true,
          ),
          field(
            "description_of_work",
            "Description of work",
            undefined,
            "ESV Quick Reference Guide p15; actual completed work requires the electrician",
            true,
          ),
          ...references,
          field(
            "client_name",
            "Saved client name",
            saved?.clientName,
            "jobs.agentContext.clientName",
          ),
        ]
      : [
          ...references,
          field(
            "inspector_name",
            "Chosen inspector",
            saved?.inspectorName,
            "jobs.agentContext.inspectorName",
          ),
          field(
            "inspector_email",
            "Chosen inspector email",
            saved?.inspectorEmail,
            "jobs.agentContext.inspectorEmail",
          ),
          field(
            "contractor_email",
            "Contractor email",
            saved?.contractorEmail,
            "jobs.agentContext.contractorEmail",
          ),
          field(
            "contractor_phone",
            "Contractor phone",
            saved?.contractorPhone,
            "jobs.agentContext.contractorPhone",
          ),
          field(
            "planned_start",
            "Planned start date",
            saved?.plannedStartDate,
            "jobs.agentContext.plannedStartDate",
          ),
          field(
            "site_access",
            "Confirmed site access",
            saved?.siteAccess,
            "jobs.agentContext.siteAccess",
          ),
        ];

  const missingInformation: Missing[] = fields
    .filter((entry) => entry.value === null)
    .map((entry) => ({
      field: entry.field,
      label: entry.label,
      reason:
        entry.field === "description_of_work"
          ? "The electrician must enter the actual completed installation work. Planned scope is shown separately and must not be certified as already performed."
          : "No confirmed value is saved; supply it yourself before using this draft.",
    }));

  missingInformation.push(
    ...(kind === "coes-portal"
      ? [
          {
            field: "electrical_tests",
            label: "Actual installation and test information",
            reason:
              "Confirm actual work, Test Results, maximum demand, consumer mains capacity, installation work type and any previous failed inspection/audit in ESVConnect. These are completion requirements, not inferred job facts.",
          },
          {
            field: "certification",
            label: "Responsible person, licences and certification",
            reason:
              "The electrician must confirm the responsible person, applicable licence/REC details, completion dates, declaration and certification. Site Ahead creates no certificate number, signature or issued COES.",
          },
          {
            field: "inspection",
            label: "Required independent inspection",
            reason:
              "Arrange and complete the required inspection; no inspection, test or portal completion is inferred from this draft.",
          },
        ]
      : [
          {
            field: "inspection_date",
            label: "Inspection time and readiness",
            reason:
              "Agree the inspection date with the chosen LEI and confirm work/test readiness. A planned start date is not an inspection booking.",
          },
          {
            field: "certificate_reference",
            label: "Actual COES reference and test information",
            reason:
              "Supply only actual certificate and testing information when available; no certificate has been created by this draft.",
          },
        ]),
  );

  const nextAction =
    kind === "coes-portal"
      ? "Review the saved reference information, open ESVConnect and complete the actual work, testing and certification fields yourself. No portal form has been submitted and no COES has been issued."
      : "Review the email, choose and verify an appropriately licensed inspector, fill the missing details and contact them yourself. No inspector is booked and no email has been sent.";

  const draft: Draft = {
    skillKey: kind,
    title:
      kind === "coes-portal"
        ? "COES portal preparation"
        : "Inspector booking enquiry",
    destinationUrl: kind === "coes-portal" ? ESV_CONNECT : LEI_REGISTER,
    guidanceUrl: kind === "coes-portal" ? COES_GUIDE : ELECTRICAL_RULE_SOURCE,
    guidance:
      kind === "coes-portal"
        ? "Portal labels are based on official public ESV guidance, not an authenticated current portal inspection. Description of work: Quick Reference Guide p15 (V5.1 filename, older V4 footer); Customer email: COES Fundamentals p4. Other displayed values are saved reference information, not claimed exact portal labels. ESVConnect can email the completed COES to the customer when their email is supplied. Review the current portal before certification."
        : "Use ESV's public register to choose and verify an LEI with the required inspection class, then contact that inspector directly. ESV guidance requires prescribed work inspection before connection. This draft creates no appointment or deadline.",
    savedAt: now,
    fields,
  };

  if (kind === "lei-booking") {
    draft.subject = `Inspection booking enquiry — ${context.job.addressText}`;
    draft.body = `Hello ${saved?.inspectorName || "[chosen inspector]"},\n\nPlease confirm your availability and requirements for a prescribed electrical-work inspection at ${context.job.addressText}.\n\nPlanned scope (please confirm current progress):\n${context.input.processedText}\n\nPlanned start: ${saved?.plannedStartDate || "[confirm date]"}\nRequested inspection time: [agree with inspector]\nSite access: ${saved?.siteAccess || "[confirm access arrangements]"}\n\nContractor: ${saved?.contractorName || "[confirm contractor]"}\nConfirmed licence: ${saved?.contractorLicence || "[supply actual licence]"}\nContact: ${saved?.contractorEmail || "[confirm email]"}; ${saved?.contractorPhone || "[confirm phone]"}\nCOES reference and completed test information: [supply actual details when available]\n\nPlease advise your required documents, readiness conditions and booking process. This is an enquiry only; no inspection or certification is claimed.\n\nRegards,\n${saved?.contractorName || "[your name]"}`;
  }

  return { draft, missingInformation, nextAction };
}
