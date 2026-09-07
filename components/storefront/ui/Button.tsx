import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent-outline"
  | "icon-circle"
  | "disabled"
  /** For the hero band, whose ground is the accent fill itself. */
  | "on-accent";
type IconSize = "sm" | "md";
type IconTone = "sunken" | "surface";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-bold whitespace-nowrap transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2";

// The focus ring colour belongs to the variant rather than to BASE_CLASSES,
// because it is decided by the ground the button sits on. Every variant here
// but one sits on a page surface, where `accent-readable` is the ring that
// flips with the theme; `on-accent` sits on the accent fill itself, where that
// same ring would be blue on blue and effectively invisible.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover focus-visible:outline-accent-readable",
  secondary:
    "border-[1.5px] border-fg bg-surface text-fg hover:bg-fg hover:text-surface focus-visible:outline-accent-readable",
  "accent-outline":
    "border-[1.5px] border-accent-readable bg-surface text-accent-readable hover:bg-accent hover:text-accent-foreground focus-visible:outline-accent-readable",
  "icon-circle": "text-fg focus-visible:outline-accent-readable",
  disabled:
    "cursor-not-allowed bg-surface-sunken text-fg-faint focus-visible:outline-accent-readable",
  // White pill, accent label — the inverse of `primary`, and the same certified
  // pair of luminances read the other way round (5.10:1 either direction). Both
  // tokens are non-flipping, so this button is identical in both themes, which
  // is what the band it sits on requires.
  "on-accent":
    "bg-accent-foreground text-accent-solid hover:bg-accent-foreground/90 focus-visible:outline-accent-foreground",
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
