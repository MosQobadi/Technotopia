import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "accent-outline" | "icon-circle" | "disabled";
type IconSize = "sm" | "md";
type IconTone = "sunken" | "surface";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-bold whitespace-nowrap transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-accent-readable focus-visible:outline-offset-2";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary:
    "border-[1.5px] border-fg bg-surface text-fg hover:bg-fg hover:text-surface",
  "accent-outline":
    "border-[1.5px] border-accent-readable bg-surface text-accent-readable hover:bg-accent hover:text-accent-foreground",
  "icon-circle": "text-fg",
  disabled: "cursor-not-allowed bg-surface-sunken text-fg-faint",
};

const ICON_TONE_CLASSES: Record<IconTone, string> = {
  sunken: "bg-surface-sunken hover:bg-surface-muted",
  surface: "bg-surface hover:bg-surface-sunken",
};

const ICON_SIZE_CLASSES: Record<IconSize, string> = {
  sm: "size-7.5 text-sm",
  md: "size-11.5 text-lg",
};

interface ButtonProps {
  variant?: ButtonVariant;
  /** Only applies to the icon-circle variant. */
  iconSize?: IconSize;
  /** Only applies to the icon-circle variant. */
  iconTone?: IconTone;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
  /** Renders as a Next.js Link styled like a button instead of a <button>. */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  "aria-label"?: string;
}

export function Button({
  variant = "primary",
  iconSize = "md",
  iconTone = "sunken",
  fullWidth,
  className,
  children,
  href,
  onClick,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const isIconOnly = variant === "icon-circle";
  const isDisabled = disabled || variant === "disabled";

  const classes = cn(
    BASE_CLASSES,
    isIconOnly ? ICON_SIZE_CLASSES[iconSize] : "px-7 py-3.5",
    VARIANT_CLASSES[variant],
    isIconOnly && ICON_TONE_CLASSES[iconTone],
    fullWidth && "w-full",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick} aria-disabled={isDisabled} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
