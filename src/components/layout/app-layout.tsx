import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { BriefcaseBusinessIcon, FolderCogIcon, UsersIcon } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { useMembership } from "@/components/auth/use-membership";
import { AuthError } from "@/components/auth/auth-card";
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
          <SidebarHeader className="p-4">
            <Link to="/app/jobs" className="text-lg font-semibold">
              Site Ahead
            </Link>
            <p className="break-words text-sm text-muted-foreground">
              {organization.name}
            </p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleNavigation.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        render={<Link to={item.to} />}
                        isActive={pathname.startsWith(item.to)}
                        tooltip={item.label}
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
          <SidebarFooter className="gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-medium">
                {user === undefined ? "Loading account..." : user.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {membership.role === "owner" ? "Owner" : "Staff"}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              {isSigningOut ? "Logging out..." : "Log out"}
            </Button>
            {error !== null && <AuthError message={error} />}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <AppBreadcrumbs />
          </header>
          <main className="flex-1 bg-muted/20 p-4 sm:p-6">
            <div className="mx-auto max-w-5xl">
              <RouteErrorBoundary key={pathname}>
                <Outlet />
              </RouteErrorBoundary>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
