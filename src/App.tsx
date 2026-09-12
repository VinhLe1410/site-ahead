import { Route, Routes, useNavigate } from "react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { AppPage } from "@/pages/app-page";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { NotFoundPage } from "@/pages/not-found-page";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export default function App() {
  const navigate = useNavigate();

  return (
    <ConvexAuthProvider
      client={convex}
      replaceURL={(url) => navigate(url, { replace: true })}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedLayout />}>
          <Route path="/app" element={<AppPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ConvexAuthProvider>
  );
}
