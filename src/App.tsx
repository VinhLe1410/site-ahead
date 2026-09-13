import { useNavigate } from "react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { AppRoutes } from "@/routes";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default function App() {
  const navigate = useNavigate();

  return (
    <ConvexAuthProvider
      client={convex}
      replaceURL={(url) => navigate(url, { replace: true })}
    >
      <AppRoutes />
    </ConvexAuthProvider>
  );
}
