import { cn } from "@/lib/cn";

interface SectionEyebrowProps {
  label: string;
  className?: string;
}

export function SectionEyebrow({ label, className }: SectionEyebrowProps) {
  return (
    <div className={cn("mb-2 flex items-center gap-2", className)}>
      <span className="bg-error size-2 shrink-0 rounded-full" aria-hidden />
      <span className="font-mono text-xs tracking-wide text-gray-500 uppercase">{label}</span>
    </div>
  );
}
