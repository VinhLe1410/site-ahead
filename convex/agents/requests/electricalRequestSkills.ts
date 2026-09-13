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

// Approved general draft examples only. Never persist as confirmed job facts
// or import this profile into evidence, certificate confirmation or delivery.
const electricalDemoProfile = {
  name: "Electrical general draft examples v1",
  customerName: "Alex Morgan (fictional customer)",
  customerEmail: "alex.morgan@customer.example",
  contractorName: "Example Electrical Services",
  contractorEmail: "office@electrical-demo.example",
  phone: "03 5550 0123",
  plannedStart: "Next available weekday morning, subject to customer agreement",
  access:
    "Proposed: meet the customer at the front entrance; confirm access arrangements before attendance",
} as const;

export const electricalRequestSkills = [
  {
    key: "lei-booking",
    name: "Licensed Electrical Inspector booking email",
    guidance:
      "Use only when the saved detailed scope satisfies the supported prescribed-work rule. Prepare an email for a human-chosen inspector. Saved facts take precedence; approved general demo contact, proposed scheduling and proposed access values must retain their DEMO labels when copied. These examples are not confirmed appointments or arrangements. There is no standard inspector booking form. Never invent the inspector identity/contact, licence, actual inspection date, completed test or certificate reference. Read the scoped job, select this skill, prepare through the trusted mapping tool, then save and wait.",
  },
  {
    key: "coes-portal",
    name: "COES information for ESVConnect",
    guidance:
      "Prepare information under verified public ESV guidance labels. Saved facts take precedence over approved general customer and contractor demo values, which must retain DEMO labels. Provide useful Description of work draft wording grounded in saved scope, clearly marked Planned and electrician review required before certification. This is not an assertion of actual completed work. Never invent licence numbers, test results, declarations, signatures, completion dates or certificate references. No portal automation, submission or certification. Read the scoped job, select this skill, prepare through the trusted mapping tool, then save and wait.",
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
  demoValue?: string,
): Draft["fields"][number] {
  const savedValue = value?.trim();

  const result: Draft["fields"][number] = {
    field,
    label,
    value: savedValue || null,
    source,
    portalLabelVerified,
  };

  if (savedValue) result.method = "database";
  else if (demoValue) {
    result.value = `[DEMO DATA — replace or confirm before use] ${demoValue}`;
    result.method = "demo_data";
    result.source = electricalDemoProfile.name;
  }

  return result;
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

  const plannedWork =
    scope.classification === "prescribed"
      ? `Planned replacement of the complete main switchboard and consumer mains at ${context.job.addressText}.`
      : scope.classification === "non_prescribed"
        ? `Planned replacement of one main switch with an equivalent switch of the same current rating at the same location at ${context.job.addressText}.`
        : `Planned electrical work at ${context.job.addressText}. The detailed scope requires electrician review; refer to the original saved scope below.`;

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
      "Contractor name",
      saved?.contractorName,
      "jobs.agentContext.contractorName",
      false,
      electricalDemoProfile.contractorName,
    ),
    field(
      "contractor_licence",
      "Contractor-confirmed licence",
      saved?.contractorLicence,
      "jobs.agentContext.contractorLicence",
    ),
    field(
      "contractor_email",
      "Contractor email",
      saved?.contractorEmail,
      "jobs.agentContext.contractorEmail",
      false,
      electricalDemoProfile.contractorEmail,
    ),
    field(
      "contractor_phone",
      "Contractor phone",
      saved?.contractorPhone,
      "jobs.agentContext.contractorPhone",
      false,
      electricalDemoProfile.phone,
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
            electricalDemoProfile.customerEmail,
          ),
          field(
            "description_of_work",
            "Description of work",
            `DRAFT — Planned electrical work; electrician review required before certification.\n\n${plannedWork}\n\nThe electrician must confirm the actual work, ratings and affected circuits, then revise this description before certification. Completed work, testing and inspection are not established by this draft.`,
            "Draft wording based on inputs.processedText; ESV Quick Reference Guide p15",
            true,
          ),
          ...references,
          field(
            "client_name",
            "Client name",
            saved?.clientName,
            "jobs.agentContext.clientName",
            false,
            electricalDemoProfile.customerName,
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
            "planned_start",
            "Proposed start date or window",
            saved?.plannedStartDate,
            "jobs.agentContext.plannedStartDate",
            false,
            electricalDemoProfile.plannedStart,
          ),
          field(
            "site_access",
            "Site access proposal",
            saved?.siteAccess,
            "jobs.agentContext.siteAccess",
            false,
            electricalDemoProfile.access,
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
            field: "actual_description_of_work",
            label: "Actual completed-work description",
            reason:
              "The Description of work value is planned draft wording only. The electrician must revise and confirm it against the actual completed installation before certification.",
          },
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
      ? "Review the draft, replace or confirm every DEMO value and revise planned wording against actual completed work before certification in ESVConnect. No form has been submitted and no COES has been issued."
      : "Review the email, replace or confirm every DEMO value, choose an appropriately licensed inspector and agree an appointment yourself. No inspector is booked and no email has been sent.";

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
        ? "Portal labels are based on public ESV guidance, not an authenticated current portal inspection. Description of work: Quick Reference Guide p15 (V5.1 filename, older V4 footer); Customer email and Address: COES Fundamentals p4/p6. Planned description wording requires electrician review before certification. DEMO values are fictional examples, not confirmed job facts. ESVConnect can email the completed COES to the customer: replace a demo email with the real confirmed recipient before any portal use."
        : "Use ESV's public register to choose and verify an LEI with the required inspection class, then contact that inspector directly. ESV guidance requires prescribed work inspection before connection. This draft creates no appointment or deadline.",
    savedAt: now,
    fields,
  };

  if (kind === "lei-booking") {
    const value = (key: string, missing: string) =>
      fields.find((entry) => entry.field === key)?.value ?? missing;

    draft.subject = `Inspection booking enquiry — ${context.job.addressText}`;
    draft.body = `DRAFT FOR REVIEW — replace or confirm any DEMO DATA before sending.\n\nHello ${saved?.inspectorName || "[chosen inspector]"},\n\nPlease confirm your availability and requirements for a prescribed electrical-work inspection at ${context.job.addressText}.\n\n${plannedWork}\nCompleted work, testing and inspection are not established by this enquiry; please confirm readiness before attendance.\n\nProposed start: ${value("planned_start", "[confirm date]")}\nRequested inspection time: [agree with inspector]\nSite access proposal: ${value("site_access", "[confirm access arrangements]")}\n\nContractor: ${value("contractor_name", "[confirm contractor]")}\nConfirmed licence: ${saved?.contractorLicence || "[supply actual licence]"}\nContact: ${value("contractor_email", "[confirm email]")}; ${value("contractor_phone", "[confirm phone]")}\nCOES reference and completed test information: [supply actual details when available]\n\nPlease advise your required documents, readiness conditions and booking process. This is an enquiry only; no inspection, certification or appointment is claimed.\n\nRegards,\n${value("contractor_name", "[your name]")}`;
  }

  return { draft, missingInformation, nextAction };
}
