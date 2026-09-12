import { Link } from "react-router";
import { useConvexAuth } from "convex/react";
import { buttonVariants } from "@/components/ui/button";

export function LandingPage() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-between gap-16 px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link className="text-lg font-semibold tracking-tight" to="/">
            Site Ahead
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link
              className={buttonVariants()}
              to={isAuthenticated ? "/app" : "/login"}
            >
              {isAuthenticated ? "Open app" : "Log in"}
            </Link>
          </nav>
        </header>

        <section className="max-w-2xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            For contractors who want to arrive prepared
          </p>
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Make every site visit count.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Site Ahead will help you prepare for site visits with the job
            context, questions, and follow-up details you need in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className={buttonVariants({ size: "lg" })}
              to={isAuthenticated ? "/app" : "/login"}
            >
              {isAuthenticated ? "Open app" : "Get started with Google"}
            </Link>
          </div>
        </section>

        <footer className="text-sm text-muted-foreground">
          Job checklists and reports are coming next.
        </footer>
      </div>
    </main>
  );
}
