import { createContext, useContext } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";

type ActiveOrganization = Extract<
  FunctionReturnType<typeof api.organizations.current>,
  { state: "active" }
>;

export const MembershipContext = createContext<ActiveOrganization | null>(null);

export function useMembership() {
  const membership = useContext(MembershipContext);

  if (membership === null)
    throw new Error("Organization pages must be inside MembershipLayout");

  return membership;
}
