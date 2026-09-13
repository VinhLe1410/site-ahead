import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          That Site Ahead page does not exist yet.
        </p>
        <Link className={`${buttonVariants()} mt-6`} to="/app">
          Go to the app
        </Link>
      </div>
    </main>
  );
}
