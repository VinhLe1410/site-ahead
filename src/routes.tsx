import { Route, Routes } from "react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { AppPage } from "@/pages/app-page";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { NotFoundPage } from "@/pages/not-found-page";

export function AppRoutes() {
  return (
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
  );
}
