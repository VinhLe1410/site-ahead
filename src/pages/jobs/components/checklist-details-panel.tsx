import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const desktopQuery = "(min-width: 1280px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);

  return () => media.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}

function serverSnapshot() {
  return false;
}

export function ChecklistDetailsPanel({
  title,
  children,
  returnFocus,
  editNote,
  onClose,
}: {
  title: string;
  children: ReactNode;
  returnFocus: HTMLButtonElement;
  editNote: boolean;
  onClose: () => void;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    desktopSnapshot,
    serverSnapshot,
  );

  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (desktop && !editNote)
      closeButton.current?.focus({ preventScroll: true });
  }, [desktop, editNote]);

  if (!desktop)
    return (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
          finalFocus={() => returnFocus}
        >
          <SheetHeader className="border-b p-5 pr-12">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Checklist details</SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    );

  return (
    <aside
      className="sticky top-5 max-h-[calc(100vh-2.5rem)] self-start overflow-y-auto border bg-card"
      aria-labelledby="item-detail-heading"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card p-5">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            Checklist details
          </p>
          <h2 id="item-detail-heading" className="font-semibold leading-6">
            {title}
          </h2>
        </div>
        <Button
          ref={closeButton}
          variant="ghost"
          size="icon-sm"
          aria-label="Close checklist details"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      <div className="p-5">{children}</div>
    </aside>
  );
}
