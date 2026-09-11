import type { SVGProps } from "react";

// Every glyph the storefront draws, in one file. Each is a 1.8-weight stroke on
// a 24 box in `currentColor`, so it takes the colour of whatever control it sits
// in and flips with the theme without knowing the theme exists.
//
// Drawn rather than typed: a ♥ or ✕ as a button's child is a character, so it
// renders in whichever face the locale loaded — a different heart on /en and
// /fa — can't be sized against the label beside it, and is announced as whatever
// the font calls it. These are all aria-hidden; the control they sit in carries
// the accessible name.
//
// A caller's `className` replaces the default size rather than adding to it:
// `cn` only concatenates, so two size classes on one element would fight.

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ className = "size-4.5 shrink-0", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    />
  );
}

const CROSS = "m6 6 12 12M18 6 6 18";

export function CartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 8.25h11l.9 11a1.5 1.5 0 0 1-1.5 1.6H7.1a1.5 1.5 0 0 1-1.5-1.6l.9-11Z" />
      <path d="M9 8.25v-2a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

/** Outline by default; pass `fill="currentColor"` for the saved state. */
export function HeartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.25c-.3 0-.6-.1-.83-.3C8.1 17.6 3.75 13.9 3.75 9.75 3.75 7.1 5.85 5 8.5 5c1.4 0 2.73.65 3.5 1.68C12.77 5.65 14.1 5 15.5 5c2.65 0 4.75 2.1 4.75 4.75 0 4.15-4.35 7.85-7.42 10.2-.23.2-.53.3-.83.3Z" />
    </Svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
      <path d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

/** The menu button, which draws bars when shut and a cross when open. */
export function MenuIcon({ isOpen, ...props }: IconProps & { isOpen: boolean }) {
  return (
    <Svg {...props}>
      <path d={isOpen ? CROSS : "M4 7h16M4 12h16M4 17h16"} />
    </Svg>
  );
}

/** Removing something — a wishlist card, a cart line. */
export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={CROSS} />
    </Svg>
  );
}

// The theme toggle shows the theme it will switch *to*: the moon while the page
// is light, the sun while it is dark.
export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.25 14.4A8.25 8.25 0 0 1 9.6 3.75a8.25 8.25 0 1 0 10.65 10.65Z" />
    </Svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2M12 19.25v2M4.22 4.22l1.41 1.41M18.37 18.37l1.41 1.41M2.75 12h2M19.25 12h2M4.22 19.78l1.41-1.41M18.37 5.63l1.41-1.41" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </Svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2.5 6.5 8.4 5.6a2 2 0 0 0 2.2 0l8.4-5.6" />
    </Svg>
  );
}

/** A step that is done — the order tracking row. */
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15m0 0-6-6m6 6-6 6" />
    </Svg>
  );
}
