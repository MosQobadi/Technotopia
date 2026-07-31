import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface EmptyStateProps {
  message: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ message, actionLabel, actionHref, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("bg-surface-100 rounded-[20px] px-6 py-16 text-center", className)}>
      <p className="mb-5 text-base text-gray-500">{message}</p>
      <Button variant="primary" href={actionHref} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
