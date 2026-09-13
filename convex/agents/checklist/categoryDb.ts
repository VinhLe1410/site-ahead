export type ChecklistCategory = "electrical_work" | "carpentry_renovation";

export type ChecklistItemCategory = "automated" | "third_party" | "on_site";

export type ChecklistItemCondition =
  | "base"
  | "trigger:prescribed_work"
  | "trigger:job_value_over_16k"
  | "trigger:pre_1990_construction";

export type ChecklistItem = {
  key: string;
  category: ChecklistItemCategory;
  condition: ChecklistItemCondition;
  title: string;
  action: string;
};

export type ChecklistRecord = {
  id: ChecklistCategory;
  title: string;
  checklistJson: readonly ChecklistItem[];
};

export const categoryDb: readonly ChecklistRecord[] = [
  {
    id: "electrical_work",
    title: "Electrical Work",
    checklistJson: [
      {
        key: "electrical.work_classification",
        category: "automated",
        condition: "base",
        title: "Work classified prescribed vs non-prescribed",
        action:
          "rule-based classification from job description; if unclear, treat as unresolved for human checking (note only, don't implement the fallback logic now)",
      },
      {
        key: "electrical.ces_prepared",
        category: "on_site",
        condition: "base",
        title: "Certificate of Electrical Safety (CES) prepared",
        action: "manual check",
      },
      {
        key: "electrical.lei_inspection_request",
        category: "third_party",
        condition: "trigger:prescribed_work",
        title: "Independent inspection booked (LEI, 8-business-day window)",
        action: "draft inspection booking request",
      },
      {
        key: "electrical.rcd_coverage_check",
        category: "on_site",
        condition: "base",
        title: "Safety switch (RCD) coverage confirmed",
        action: "manual check",
      },
    ],
  },
  {
    id: "carpentry_renovation",
    title: "Carpentry & Renovation",
    checklistJson: [
      {
        key: "carpentry.construction_year",
        category: "automated",
        condition: "base",
        title: "Construction year (pre/post 1990)",
        action: "records lookup; pre-1990 result feeds the asbestos item below",
      },
      {
        key: "carpentry.job_value_threshold",
        category: "automated",
        condition: "base",
        title: "Job value vs $10k / $16k thresholds",
        action: "rule-based comparison against job value",
      },
      {
        key: "carpentry.certificate_of_consent",
        category: "third_party",
        condition: "trigger:job_value_over_16k",
        title:
          "Certificate of Consent from the Building and Plumbing Commission",
        action: "draft Certificate of Consent submission",
      },
      {
        key: "carpentry.building_permit_surveyor",
        category: "third_party",
        condition: "base",
        title: "Building permit + registered surveyor appointed",
        action: "track permit/surveyor appointment",
      },
      {
        key: "carpentry.asbestos_assessment",
        category: "on_site",
        condition: "trigger:pre_1990_construction",
        title: "Asbestos disturbance assessment",
        action: "manual check + note",
      },
      {
        key: "carpentry.occupancy_permit",
        category: "third_party",
        condition: "base",
        title:
          "Occupancy Permit / Certificate of Final Inspection on completion",
        action: "draft/track completion certificate",
      },
    ],
  },
];

export function resolveChecklistForCategory(
  category: ChecklistCategory | "unresolved",
): readonly ChecklistItem[] | null {
  if (category === "unresolved") {
    return null;
  }

  return (
    categoryDb.find((record) => record.id === category)?.checklistJson ?? null
  );
}
