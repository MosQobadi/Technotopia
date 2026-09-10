"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { brandListHref, categoryListHref } from "@/lib/storefront/plp";
import type { StorefrontSearchResult } from "@/types/search";
import { ArrowIcon } from "./icons";

const SEARCH_SCOPE_KEYS = ["all", "products", "categories", "brands"] as const;
type SearchScope = (typeof SEARCH_SCOPE_KEYS)[number];

const EMPTY_RESULT: StorefrontSearchResult = { products: [], categories: [], brands: [] };

// Long enough that typing a word isn't one request per keystroke, short enough that the
// panel still feels attached to the keyboard.
const DEBOUNCE_MS = 250;

/** What came back, and what it came back for — see `isStale` below. */
interface SearchResponse {
  query: string;
  scope: SearchScope;
  data: StorefrontSearchResult;
  /** The request failed — which is not the same thing as finding nothing. */
  failed: boolean;
}

/**
 * The navbar's scoped search: a suggestions panel under the input, not a results page.
 * That shape follows the endpoint — GET /api/storefront/search returns at most five
 * products, five categories and five brands, with no paging and no totals, so there is
 * nothing for a results page to page through.
 */
export function NavbarSearch() {
  const t = useTranslations("nav");

  const [scope, setScope] = useState<SearchScope>("all");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Bumped by "Try again", to send the same query's request once more.
  const [attempt, setAttempt] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  // Results are tagged with the query and scope that produced them instead of being
  // cleared on every keystroke: that keeps the "loading" state derived rather than
  // stored, and it means the panel can't briefly show the previous query's hits.
  const isStale = response === null || response.query !== trimmedQuery || response.scope !== scope;
  const results = isStale ? EMPTY_RESULT : response.data;
  const isLoading = trimmedQuery.length > 0 && isStale;
  const hasFailed = !isStale && response.failed;

  useEffect(() => {
    if (!trimmedQuery) return;

    // The controller does double duty: it cancels the request still in flight when the
    // query changes, and it stops a slow earlier response from landing on top of a
    // newer one.
    const controller = new AbortController();

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: trimmedQuery, scope });
      fetch(`/api/storefront/search?${params}`, { signal: controller.signal })
        .then((result) => result.json())
        .then((body) => {
          setResponse({
            query: trimmedQuery,
            scope,
            data: body?.success ? (body.data as StorefrontSearchResult) : EMPTY_RESULT,
            failed: !body?.success,
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResponse({ query: trimmedQuery, scope, data: EMPTY_RESULT, failed: true });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, scope, attempt]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const resultCount = results.products.length + results.categories.length + results.brands.length;
  const isPanelOpen = isOpen && trimmedQuery.length > 0;

  function handleSubmit(event: FormEvent) {
    // There is no results page to navigate to — submitting just makes sure the panel is
    // showing, for anyone who typed and hit Enter before it opened.
    event.preventDefault();
    setIsOpen(true);
  }

  function closePanel() {
    setIsOpen(false);
  }

  function retrySearch() {
    // Clearing the response is what puts the panel back into its loading state;
    // the bump is what sends the request again for the same query.
    setResponse(null);
    setAttempt((current) => current + 1);
  }

  return (
    <div ref={containerRef} className="relative flex min-w-55 flex-1 flex-col">
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex items-center overflow-hidden rounded-full bg-surface-sunken"
      >
        <label className="sr-only" htmlFor="navbar-search-scope">
          {t("searchScope")}
        </label>
        <select
          id="navbar-search-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as SearchScope)}
          className="h-10 shrink-0 rounded-full bg-transparent py-0 ps-3.5 pe-1.5 text-xs text-fg-subtle outline-none"
        >
          {SEARCH_SCOPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`searchScopeOptions.${key}`)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="navbar-search-input">
          {t("search")}
        </label>
        <input
          id="navbar-search-input"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <button
          type="submit"
          aria-label={t("search")}
          className="bg-accent hover:bg-accent-hover focus-visible:outline-accent-readable m-0.75 flex size-8.5 shrink-0 items-center justify-center rounded-full text-accent-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ArrowIcon className="size-4" />
        </button>
      </form>

      {isPanelOpen && (
        <div
          role="region"
          aria-label={t("searchResults")}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-line bg-surface py-2 shadow-lg"
        >
          <p className="sr-only" aria-live="polite">
            {isLoading
              ? t("searchLoading")
              : hasFailed
                ? t("searchFailed")
                : t("searchResultCount", { count: resultCount })}
          </p>

          {isLoading && <p className="px-4 py-3 text-sm text-fg-subtle">{t("searchLoading")}</p>}

          {/* A failed request is not an empty result: "no results for X" would
              send the customer off to rephrase a query that was fine. */}
          {hasFailed && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <p className="text-fg-subtle">{t("searchFailed")}</p>
              <button
                type="button"
                onClick={retrySearch}
                className="text-accent-readable focus-visible:outline-accent-readable shrink-0 cursor-pointer rounded font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t("searchRetry")}
              </button>
            </div>
          )}

          {!isLoading && !hasFailed && resultCount === 0 && (
            <p className="px-4 py-3 text-sm text-fg-subtle">
              {t("searchNoResults", { query: trimmedQuery })}
            </p>
          )}

          {results.products.length > 0 && (
            <SearchGroup label={t("searchScopeOptions.products")}>
              {results.products.map((product) => (
                <SearchRow
                  key={product.id}
                  href={`/products/${product.slug}`}
                  label={product.name}
                  meta={formatPrice(product.price)}
                  onSelect={closePanel}
                />
              ))}
            </SearchGroup>
          )}

          {results.categories.length > 0 && (
            <SearchGroup label={t("searchScopeOptions.categories")}>
              {results.categories.map((category) => (
                <SearchRow
                  key={category.id}
                  href={categoryListHref(category.slug)}
                  label={category.name}
                  onSelect={closePanel}
                />
              ))}
            </SearchGroup>
          )}

          {results.brands.length > 0 && (
            <SearchGroup label={t("searchScopeOptions.brands")}>
              {results.brands.map((brand) => (
                <SearchRow
                  key={brand.id}
                  href={brandListHref(brand.slug)}
                  label={brand.name}
                  onSelect={closePanel}
                />
              ))}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 py-1 text-[10px] font-bold tracking-wide text-fg-subtle uppercase">
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function SearchRow({
  href,
  label,
  meta,
  onSelect,
}: {
  href: string;
  label: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onSelect}
        className="focus-visible:outline-accent-readable flex items-center justify-between gap-3 px-4 py-2 text-sm text-fg outline-none hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <span className="truncate">{label}</span>
        {meta && <span className="shrink-0 text-xs text-fg-subtle">{meta}</span>}
      </Link>
    </li>
  );
}
