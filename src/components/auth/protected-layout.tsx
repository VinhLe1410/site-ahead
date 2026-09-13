import { useConvexAuth } from "convex/react";
import { Navigate, Outlet, useLocation } from "react-router";
import { AuthLoading } from "@/components/auth/auth-loading";
import { locationReturnTo, withReturnTo } from "@/components/auth/return-to";

export function ProtectedLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={withReturnTo("/login", locationReturnTo(location))}
        replace
      />
    );
  }

  return <Outlet />;
}
