import { HardHatIcon } from "lucide-react";

export function Brand() {
  return (
    <span className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight">
      <span
        className="flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <HardHatIcon className="size-5" />
      </span>
      Site Ahead
    </span>
  );
}
