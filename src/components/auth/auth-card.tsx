import type { ReactNode } from "react";
import { Link } from "react-router";
import { Brand } from "@/components/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="w-full max-w-md [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader>
        <Link className="mb-6 w-fit" to="/">
          <Brand />
        </Link>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight wrap-anywhere">
          {title}
        </h1>
        {description !== undefined && (
          <CardDescription className="mt-2 leading-6">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4 py-10">
      {children}
    </main>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }

  return (
    <p
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}
