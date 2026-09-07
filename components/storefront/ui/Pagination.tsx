import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { paginationRange } from "@/lib/storefront/plp";

// Real links, not buttons: a paged catalog is only reachable — by a crawler, by
// a bookmark, by the back button — if page 2 has a URL of its own. The caller
// owns what a page's href looks like, since it holds the filters; this owns
// which pages are offered.

interface PaginationProps {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  className?: string;
}

const STEP_CLASS =
  "focus-visible:outline-accent-readable bg-surface-sunken text-fg inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2";

// Disabled ends are spans, not disabled links — there is no page 0 to point at,
// so there should be nothing to focus either.
const STEP_DISABLED_CLASS =
  "bg-surface-sunken text-fg-faint inline-flex min-h-11 cursor-not-allowed items-center rounded-full px-4 text-[13px] font-semibold";

const PAGE_CLASS =
  "focus-visible:outline-accent-readable bg-surface-sunken text-fg inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2";

const PAGE_CURRENT_CLASS =
  "bg-fg text-surface inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold";

export function Pagination({ page, pageCount, hrefForPage, className }: PaginationProps) {
  const t = useTranslations("common.pagination");

  // One page of results needs no pager, and zero pages means the caller is
  // already showing an empty state.
  if (pageCount <= 1) return null;

  const current = Math.min(Math.max(page, 1), pageCount);

  return (
    <nav aria-label={t("label")} className={cn("mt-10", className)}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {current > 1 ? (
            <Link href={hrefForPage(current - 1)} rel="prev" className={STEP_CLASS}>
              {t("previous")}
            </Link>
          ) : (
            <span aria-hidden="true" className={STEP_DISABLED_CLASS}>
              {t("previous")}
            </span>
          )}
        </li>

        {paginationRange(current, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-fg-faint px-1 text-[13px]">
              …
            </li>
          ) : (
            <li key={entry}>
              {entry === current ? (
                <span aria-current="page" className={PAGE_CURRENT_CLASS}>
                  {entry}
                </span>
              ) : (
                <Link
                  href={hrefForPage(entry)}
                  aria-label={t("page", { page: entry })}
                  className={PAGE_CLASS}
                >
                  {entry}
                </Link>
              )}
            </li>
          ),
        )}

        <li>
          {current < pageCount ? (
            <Link href={hrefForPage(current + 1)} rel="next" className={STEP_CLASS}>
              {t("next")}
            </Link>
          ) : (
            <span aria-hidden="true" className={STEP_DISABLED_CLASS}>
              {t("next")}
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
