import { cn } from "@/lib/cn";

interface SectionEyebrowProps {
  label: string;
  className?: string;
}

export function SectionEyebrow({ label, className }: SectionEyebrowProps) {
  return (
    <div className={cn("mb-2 flex items-center gap-2", className)}>
      <span className="bg-danger size-2 shrink-0 rounded-full" aria-hidden />
      <span className="text-xs tracking-wide text-fg-subtle uppercase">{label}</span>
    </div>
  );
}
