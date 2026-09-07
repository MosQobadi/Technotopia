"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const ROTATE_INTERVAL_MS = 6000;

interface HeroRotatorLabels {
  previous: string;
  next: string;
  /** One label per slide, already interpolated with its number. */
  goTo: string[];
}

// The rotation, and nothing else. The slides themselves arrive as
// server-rendered children from HomeHero — this island wraps each one, decides
// which is visible, and draws the controls. It is only mounted when there are
// two or more banners, so a single-banner hero carries none of this code.
//
// An inactive slide is hidden with the `hidden` attribute rather than with
// opacity or a transform. That does three jobs at once: it takes the slide out
// of the accessibility tree and out of the tab order, and it stops the browser
// fetching that slide's lazy photograph until the slide is shown. A carousel
// that cross-fades looks better and costs every banner's image on first paint;
// this is the trade the LCP requirement decides for us.
export function HeroRotator({
  children,
  labels,
}: {
  children: ReactNode;
  labels: HeroRotatorLabels;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Starts true, so nothing auto-advances until we have actually asked the
  // browser. The alternative — assume motion is fine and correct it in an
  // effect — is the same answer everywhere except on the machines the setting
  // exists for, and it is also what keeps the server's markup and the first
  // client render identical.
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    // Reduced motion switches auto-advance off entirely rather than slowing it
    // down: the objection to a carousel is that the page moves on its own, and
    // a slower interval is still the page moving on its own. The controls stay,
    // so every banner is still reachable.
    if (reducedMotion || paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, paused, count]);

  function goTo(index: number) {
    setActive((index + count) % count);
  }

  return (
    // onFocus/onBlur are React's delegated focusin/focusout, so they fire for
    // anything focused anywhere inside the band — the CTA and the controls
    // included. Between them and the pointer handlers, the hero holds still
    // whenever someone is actually reading or using it.
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div key={index} hidden={index !== active}>
          {slide}
        </div>
      ))}

      <div className="mt-9 flex items-center gap-3">
        <ArrowButton label={labels.previous} onClick={() => goTo(active - 1)}>
          ←
        </ArrowButton>
        <ArrowButton label={labels.next} onClick={() => goTo(active + 1)}>
          →
        </ArrowButton>

        <div className="ms-2 flex gap-2">
          {slides.map((_, index) => (
            // A dot has no glyph inside it, so the dot itself is the whole
            // control and has to clear 3:1 against the band even when it is
            // inactive. /70 is 3.28 on this blue; the /45 first written here
            // was 2.18. State is carried by the width as well as the value.
            <button
              key={index}
              type="button"
              aria-label={labels.goTo[index]}
              aria-current={index === active}
              onClick={() => goTo(index)}
              className={cn(
                "focus-visible:outline-accent-foreground h-1.5 cursor-pointer rounded-full transition-all outline-none focus-visible:outline-2 focus-visible:outline-offset-4",
                index === active ? "bg-accent-foreground w-7" : "bg-accent-foreground/70 w-2.5",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// The arrows sit with the dots under the copy rather than floating on top of
// the photograph, where they used to cover whatever the admin had uploaded and
// were the first thing to become unreadable against a pale image.
function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="border-accent-foreground/35 text-accent-foreground hover:bg-accent-foreground/15 focus-visible:outline-accent-foreground flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* The glyph turns around with the reading direction; the button does not. */}
      <span aria-hidden className="rtl:-scale-x-100">
        {children}
      </span>
    </button>
  );
}
