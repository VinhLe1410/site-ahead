import { Route, Routes } from "react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ProtectedLayout } from "@/components/auth/protected-layout";
import { AppIndexRedirect } from "@/components/layout/app-index-redirect";
import { AppLayout } from "@/components/layout/app-layout";
import { CategoriesPage } from "@/pages/categories/categories-page";
import { CategoryPage } from "@/pages/categories/category-page";
import { NewCategoryPage } from "@/pages/categories/new-category-page";
import { JobPage } from "@/pages/jobs/job-page";
import { JobsPage } from "@/pages/jobs/jobs-page";
import { NewJobPage } from "@/pages/jobs/new-job-page";
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
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<AppIndexRedirect />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<NewJobPage />} />
          <Route path="jobs/:jobId" element={<JobPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="categories/new" element={<NewCategoryPage />} />
          <Route path="categories/:categoryId" element={<CategoryPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
