import {
  buildingPermitSkill,
  buildingPermitValues,
} from "./buildingPermitSkill";
import {
  occupancyPermitSkill,
  occupancyPermitValues,
} from "./occupancyPermitSkill";
import type { RequestJob } from "./requestProfile";

export const requestSkills = [buildingPermitSkill, occupancyPermitSkill];

export type RequestFormKey = (typeof requestSkills)[number]["key"];

export function requestSkill(key: string) {
  return requestSkills.find((skill) => skill.key === key) ?? null;
}

export function requestKind(
  title: string,
  categoryTitle: string | undefined,
): RequestFormKey | null {
  if (!categoryTitle?.toLowerCase().includes("carpentry")) return null;
  const normalized = title.toLowerCase();

  if (normalized.includes("building permit")) return "building-permit-request";

  if (
    normalized.includes("occupancy") ||
    normalized.includes("final inspection")
  )
    return "occupancy-inspection-request";

  return null;
}

export function requestValues(key: RequestFormKey, job: RequestJob) {
  return key === "building-permit-request"
    ? buildingPermitValues(job)
    : occupancyPermitValues(job);
}
