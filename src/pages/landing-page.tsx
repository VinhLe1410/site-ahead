import { Link } from "react-router";
import { useConvexAuth } from "convex/react";
import {
  CheckIcon,
  ClipboardListIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { ChecklistKindBadge } from "@/pages/jobs/components/checklist-kind-badge";

const exampleItems = [
  {
    title: "Confirm site access",
    kind: "on_site",
    done: true,
    notes: "Side gate access confirmed. Call before arrival.",
  },
  {
    title: "Locate underground services",
    kind: "third_party",
    done: false,
    notes: "",
  },
  { title: "Check ground conditions", kind: "on_site", done: false, notes: "" },
  {
    title: "Confirm boundary position",
    kind: "on_site",
    done: false,
    notes: "",
  },
] as const;

export function LandingPage() {
  const { isAuthenticated } = useConvexAuth();
  const destination = isAuthenticated ? "/app" : "/login";

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" aria-label="Site Ahead home">
            <Brand />
          </Link>
          <nav aria-label="Account">
            <Link
              className={buttonVariants({ variant: "outline" })}
              to={destination}
            >
              {isAuthenticated ? "Open app" : "Log in"}
            </Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:min-h-[42rem] lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-24">
        <div>
          <h1 className="max-w-lg text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Know the site before you drive out.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">
            Keep the job brief, site checks, and team notes together. Arrive
            knowing what's done and what still needs a look.
          </p>
          <Link
            className={`${buttonVariants({ size: "lg" })} mt-8`}
            to={destination}
          >
            {isAuthenticated ? "Open app" : "Get started with Google"}
          </Link>
        </div>
        <div className="min-w-0 border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3">
            <span className="text-sm font-medium">Example job</span>
            <span className="text-sm text-muted-foreground">
              Excavation & trenching
            </span>
          </div>
          <div className="flex items-start gap-3 border-b px-5 py-5">
            <MapPinIcon
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                18 Nicholson Street
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Brunswick, Victoria
              </p>
            </div>
          </div>
          <ul className="divide-y">
            {exampleItems.map((item) => (
              <li key={item.title} className="flex items-start gap-3 px-5 py-4">
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border ${item.done ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
                >
                  {item.done && (
                    <CheckIcon className="size-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {item.done ? "Done" : "Pending"}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    <ChecklistKindBadge kind={item.kind} />
                  </div>
                  {item.notes.length > 0 && (
                    <p className="mt-2 border-l-2 pl-3 text-sm leading-6 text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-3 md:gap-10 md:py-12">
          <div>
            <ClipboardListIcon className="mb-4 size-5" aria-hidden="true" />
            <h2 className="text-lg font-semibold">A checklist for each job</h2>
            <p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
              Create templates for the work you do. Each new job gets its own
              checklist and progress.
            </p>
          </div>
          <div>
            <CheckIcon className="mb-4 size-5" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Checks and notes together</h2>
            <p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
              Mark checks as you finish them. Keep observations beside the item
              they belong to.
            </p>
          </div>
          <div>
            <UsersIcon className="mb-4 size-5" aria-hidden="true" />
            <h2 className="text-lg font-semibold">The same job for everyone</h2>
            <p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
              Invite your crew to one organization. Share jobs, templates, and
              the latest notes.
            </p>
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:px-8">
        <span>Site Ahead</span>
        <span>Site visit preparation for contractors.</span>
      </footer>
    </main>
  );
}
