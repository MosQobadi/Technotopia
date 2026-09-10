import { notFound } from "next/navigation";

// Any address under a locale that no route claims. Without this route Next
// answers from outside app/[locale] — no locale, no storefront layout — and the
// translated not-found.tsx beside it is never reached.
export default function UnknownPage() {
  notFound();
}
