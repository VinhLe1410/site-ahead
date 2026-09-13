import { MembershipContext, useMembership } from "./use-membership";
import { useQuery } from "convex/react";
import { Navigate, Outlet, useLocation } from "react-router";
import { api } from "../../../convex/_generated/api";
import { AuthLoading } from "./auth-loading";
import { locationReturnTo, withReturnTo } from "./return-to";

export function MembershipLayout() {
  const current = useQuery(api.organizations.current);
  const location = useLocation();

  if (current === undefined) return <AuthLoading />;

  if (current.state !== "active")
    return (
      <Navigate
        to={withReturnTo("/app/organization/new", locationReturnTo(location))}
        replace
      />
    );

  return (
    <MembershipContext value={current}>
      <Outlet />
    </MembershipContext>
  );
}

export function OwnerLayout() {
  const { membership } = useMembership();

  if (membership.role !== "owner")
    return (
      <div role="alert">
        <h1 className="text-2xl font-semibold">Owner access required</h1>
        <p className="mt-2 text-muted-foreground">
          Only the owner can manage the organization.
        </p>
      </div>
    );

  return <Outlet />;
}
