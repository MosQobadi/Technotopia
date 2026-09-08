"use client";

import { useEffect, type RefObject } from "react";

/**
 * Close an open header panel the three ways it should close: a pointer outside
 * it, focus moving outside it, or Escape.
 *
 * Listening on `pointerdown` rather than `click` is what lets a press on
 * another trigger do both things — the panel that was open closes on the press,
 * and the button under the pointer still gets its click. That is the whole
 * reason the mini-cart can reopen itself on an add made while it is already
 * showing.
 *
 * `focusin` is the same rule for a keyboard, which never presses anything:
 * without it, tabbing from the open drawer to the cart button would leave two
 * panels hanging off one header.
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    }

    function handleFocusIn(event: FocusEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, isOpen, onDismiss]);
}
