import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

// The round control the storefront header is built from — the wishlist and
// account links, the mini-cart trigger, the menu button. One definition rather
// than the same forty characters of Tailwind copied into each of them, because
// they are the same control and have to stay the same size.

type HeaderIconTone = "sunken" | "solid";

const BASE_CLASSES =
  "flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-accent-readable focus-visible:outline-offset-2";

const TONE_CLASSES: Record<HeaderIconTone, string> = {
  sunken: "bg-surface-sunken text-fg hover:bg-surface-muted",
  // The signed-in avatar: the one control in the row that is filled, because it
  // stands for a person rather than for a place.
  solid: "bg-fg text-sm font-bold text-surface",
};

interface HeaderIconButtonProps {
  label: string;
  children: ReactNode;
  tone?: HeaderIconTone;
  /** Renders a Link instead of a <button>. */
  href?: string;
  onClick?: () => void;
  className?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-haspopup"?: "dialog" | "menu";
}

export function HeaderIconButton({
  label,
  children,
  tone = "sunken",
  href,
  onClick,
  className,
  ...rest
}: HeaderIconButtonProps) {
  const classes = cn(BASE_CLASSES, TONE_CLASSES[tone], className);

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} className={classes} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
