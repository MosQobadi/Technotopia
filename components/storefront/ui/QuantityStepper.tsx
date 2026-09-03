import { cn } from "@/lib/cn";

type QuantityStepperSize = "sm" | "md";

const SIZE_CLASSES: Record<QuantityStepperSize, { button: string; value: string; icon: string }> = {
  sm: { button: "size-8", value: "w-7 text-[13px]", icon: "text-[15px]" },
  md: { button: "size-10.5", value: "w-10 text-[15px]", icon: "text-lg" },
};

interface QuantityStepperProps {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  max?: number;
  size?: QuantityStepperSize;
  className?: string;
}

export function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
  min = 1,
  max,
  size = "md",
  className,
}: QuantityStepperProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const atMin = value <= min;
  const atMax = max != null && value >= max;

  return (
    <div className={cn("bg-surface-100 flex items-center rounded-full", className)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={onDecrease}
        disabled={atMin}
        className={cn(
          "flex items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          sizeClasses.button,
          sizeClasses.icon,
        )}
      >
        −
      </button>
      <span className={cn("text-ink-900 text-center font-semibold", sizeClasses.value)}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={onIncrease}
        disabled={atMax}
        className={cn(
          "flex items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
          sizeClasses.button,
          sizeClasses.icon,
        )}
      >
        +
      </button>
    </div>
  );
}
