import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { BriefcaseBusinessIcon, FolderCogIcon, UsersIcon } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { useMembership } from "@/components/auth/use-membership";
import { AuthError } from "@/components/auth/auth-card";
import { Brand } from "@/components/brand";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { RouteErrorBoundary } from "@/components/layout/route-error-boundary";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const navigation = [
  { to: "/app/jobs", label: "Jobs", icon: BriefcaseBusinessIcon },
  { to: "/app/categories", label: "Categories", icon: FolderCogIcon },
];

function AppBreadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const section = parts[1];
  const detail = parts[2];

  const sectionLabel =
    section === "organization"
      ? "Organization"
      : section === "categories"
        ? "Categories"
        : "Jobs";

  const sectionPath = `/app/${section ?? "jobs"}`;

  if (detail === undefined) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to={sectionPath} />}>
            {sectionLabel}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {detail === "new"
              ? `New ${section === "categories" ? "category" : "job"}`
              : "Details"}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function AppLayout() {
  const user = useQuery(api.users.currentUser);
  const { organization, membership } = useMembership();

  const visibleNavigation =
    membership.role === "owner"
      ? [
          ...navigation,
          { to: "/app/organization", label: "Organization", icon: UsersIcon },
        ]
      : navigation;

  const { signOut } = useAuthActions();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
      void navigate("/", { replace: true });
    } catch {
      setError("Could not log out. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="gap-5 border-b border-sidebar-border px-5 py-6">
            <Link to="/app/jobs" className="w-fit">
              <Brand />
            </Link>
            <p className="text-sm leading-6 text-sidebar-foreground/75 wrap-anywhere">
              {organization.name}
            </p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="p-3">
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleNavigation.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        render={<Link to={item.to} />}
                        isActive={pathname.startsWith(item.to)}
                        tooltip={item.label}
                        className="h-11 gap-3 px-3 data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-4 border-t border-sidebar-border p-5">
            <div className="min-w-0">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium wrap-anywhere">
                  {user?.name}
                </p>
                <span className="border border-sidebar-border px-1.5 py-0.5 text-xs text-sidebar-foreground/75">
                  {membership.role === "owner" ? "Owner" : "Staff"}
                </span>
              </div>
              <p className="text-sm text-sidebar-foreground/75 wrap-anywhere">
                {user === undefined ? "Loading account..." : user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              className="justify-start border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              {isSigningOut ? "Logging out..." : "Log out"}
            </Button>
            {error !== null && <AuthError message={error} />}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
            <SidebarTrigger />
            <AppBreadcrumbs />
          </header>
          <div className="min-w-0 flex-1 p-4 py-6 sm:p-8">
            <div className="mx-auto w-full max-w-6xl">
              <RouteErrorBoundary key={pathname}>
                <Outlet />
              </RouteErrorBoundary>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
