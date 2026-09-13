import { useRef, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export function ChecklistDetailsPanel({
  title,
  children,
  returnFocus,
  open,
  onClose,
}: {
  title: string;
  children: ReactNode;
  returnFocus: HTMLButtonElement;
  open: boolean;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        ref={panel}
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        initialFocus={() => panel.current?.querySelector("textarea") ?? true}
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
}
