"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import type { StorefrontSearchResult } from "@/types/search";

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

  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  // Results are tagged with the query and scope that produced them instead of being
  // cleared on every keystroke: that keeps the "loading" state derived rather than
  // stored, and it means the panel can't briefly show the previous query's hits.
  const isStale = response === null || response.query !== trimmedQuery || response.scope !== scope;
  const results = isStale ? EMPTY_RESULT : response.data;
  const isLoading = trimmedQuery.length > 0 && isStale;

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
          });
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResponse({ query: trimmedQuery, scope, data: EMPTY_RESULT });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, scope]);

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

  return (
    <div ref={containerRef} className="relative flex min-w-55 flex-1 flex-col">
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex items-center overflow-hidden rounded-full bg-gray-100"
      >
        <label className="sr-only" htmlFor="navbar-search-scope">
          {t("searchScope")}
        </label>
        <select
          id="navbar-search-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as SearchScope)}
          className="h-10 shrink-0 rounded-full bg-transparent py-0 ps-3.5 pe-1.5 text-xs text-gray-500 outline-none"
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
          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          aria-label={t("search")}
          className="bg-accent hover:bg-accent-hover focus-visible:outline-accent m-0.75 flex size-8.5 shrink-0 items-center justify-center rounded-full text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <SearchArrowIcon />
        </button>
      </form>

      {isPanelOpen && (
        <div
          role="region"
          aria-label={t("searchResults")}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-2 shadow-lg"
        >
          <p className="sr-only" aria-live="polite">
            {isLoading ? t("searchLoading") : t("searchResultCount", { count: resultCount })}
          </p>

          {isLoading && <p className="px-4 py-3 text-sm text-gray-500">{t("searchLoading")}</p>}

          {!isLoading && resultCount === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">
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
                  // The listing resolves ?category= by name as well as by id — the
                  // footer's Shop links already rely on that.
                  href={`/products?category=${encodeURIComponent(category.name)}`}
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
                  href={`/products?brand=${encodeURIComponent(brand.name)}`}
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
      <p className="px-4 py-1 text-[10px] font-bold tracking-wide text-gray-400 uppercase">
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
        className="focus-visible:outline-accent flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-900 outline-none hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <span className="truncate">{label}</span>
        {meta && <span className="shrink-0 text-xs text-gray-500">{meta}</span>}
      </Link>
    </li>
  );
}

function SearchArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6-6m6 6-6 6" />
    </svg>
  );
}
