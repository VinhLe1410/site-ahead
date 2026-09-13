import type { ReactNode } from "react";

export function PageHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="min-w-0 flex-1 basis-48 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-[1.75rem]">
        {title}
      </h1>
      {action !== undefined && (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
