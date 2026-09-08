// The header's line icons, in one file because the header is now three
// components — the bar, the mini-cart and the mobile drawer — and the same
// cart, heart and person appear in more than one of them.
//
// All of them are 1.8-weight strokes on a 24 box drawn in `currentColor`, so
// they take the colour of whatever control they sit in and flip with the theme
// without knowing the theme exists.

const ICON_CLASSES = "size-4.5";

export function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={ICON_CLASSES}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 8.25h11l.9 11a1.5 1.5 0 0 1-1.5 1.6H7.1a1.5 1.5 0 0 1-1.5-1.6l.9-11Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25v-2a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={ICON_CLASSES}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c-.3 0-.6-.1-.83-.3C8.1 17.6 3.75 13.9 3.75 9.75 3.75 7.1 5.85 5 8.5 5c1.4 0 2.73.65 3.5 1.68C12.77 5.65 14.1 5 15.5 5c2.65 0 4.75 2.1 4.75 4.75 0 4.15-4.35 7.85-7.42 10.2-.23.2-.53.3-.83.3Z"
      />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={ICON_CLASSES}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** The menu button, which draws bars when shut and a cross when open. */
export function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={ICON_CLASSES}
      aria-hidden
    >
      {isOpen ? (
        <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
      ) : (
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}
