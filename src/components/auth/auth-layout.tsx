import { useConvexAuth } from "convex/react";
import { Navigate, Outlet, useLocation } from "react-router";
import { AuthLoading } from "@/components/auth/auth-loading";
import { normalizeReturnTo } from "@/components/auth/return-to";

export function AuthLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={normalizeReturnTo(
          new URLSearchParams(location.search).get("returnTo"),
        )}
        replace
      />
    );
  }

  return <Outlet />;
}
