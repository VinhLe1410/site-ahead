import { Navigate, useLocation } from "react-router";

export function AppIndexRedirect() {
  const { search, hash } = useLocation();

  return <Navigate to={`/app/jobs${search}${hash}`} replace />;
}
