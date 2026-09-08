import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { HomeBrandView } from "@/types/home";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { Link } from "@/i18n/navigation";
import { DEFAULT_PRODUCT_SORT, buildProductListHref } from "@/lib/storefront/plp";

const HEADING_ID = "brands-heading";

// The shelf of brands, and the home page's *third* way of treating an image.
//
// ── Why a third case ──
// A product photograph is shot on white and the card contains it: the well is a
// light tile, the shot fills it, and the words live underneath on the card's
// own ground. A category photograph is the opposite — full-bleed, cropped to
// the tile, with the name drawn on a scrim over it (CategoryBrowseSection says
// why at length).
//
// A logo is neither, and gets neither treatment:
//
//   • It cannot be cropped. A photograph loses some pixels at the edge; a
//     wordmark loses letters. So the mark is *contained* inside a padded tile
//     — `object-contain` with room around it — rather than cover-cropped.
//   • It cannot be drawn on. The mark is the whole content of the tile; a
//     scrim over it would grey out the one thing the tile exists to show, so
//     the brand's name sits below the tile instead of on it.
//   • Its ground cannot flip. A logo is supplied as ink on transparency, and
//     that ink stays whatever the brand made it when our palette inverts — a
//     black wordmark on the dark theme's `surface-muted` is invisible. So the
//     tile is painted `bg-plate`, the one ground that is light in both themes
//     (see --app-plate in app/globals.css). It is the only surface on the
//     storefront that deliberately does not follow the theme, and this is the
//     reason.
//
// ── Why a plain link ──
// Since Task 28.2 the listing's filters are the query string, so "browse this
// brand" is an <a href> to `/products?brand=<slug>` and nothing more: no store,
// no click handler, no client component. The URL is written by
// `buildProductListHref` rather than by hand, so this section spells the param
// the same way the sidebar, the sort control and the pagination do — and the
// destination survives a reload, the back button and a paste into someone
// else's browser.
export async function BrandBrowseSection({ brands }: { brands: HomeBrandView[] }) {
  // A shop with no brand logos on file has nothing to show here — no heading
  // over an empty grid, same stance the deals rail and the category shelf take.
  if (brands.length === 0) return null;

  const t = await getTranslations("home.brands");

  return (
    <section aria-labelledby={HEADING_ID} className="mx-auto max-w-320 px-6 pt-10 pb-14">
      <SectionEyebrow label={t("eyebrow")} />
      <h2 id={HEADING_ID} className="text-fg text-title mb-8">
        {t("heading")}
      </h2>

      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {brands.map((brand) => (
          <li key={brand.id}>
            <BrandTile brand={brand} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BrandTile({ brand }: { brand: HomeBrandView }) {
  return (
    <Link
      href={buildProductListHref({
        brands: [brand.slug],
        statuses: [],
        sort: DEFAULT_PRODUCT_SORT,
        page: 1,
      })}
      className="group focus-visible:outline-accent-readable block rounded-[20px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* The padding is what contains the mark: `fill` resolves against this
          element's padding box, so the logo is inset from the tile's edge
          without a wrapper of its own. */}
      <div className="bg-plate relative aspect-3/2 rounded-[20px] p-6 transition-transform duration-150 motion-safe:group-hover:-translate-y-1">
        <Image
          src={brand.logo}
          // Decorative: the name is in the same link, a line below.
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 190px"
          className="object-contain"
        />
      </div>
      <span className="text-fg-muted text-label mt-3 block text-center text-balance">
        {brand.name}
      </span>
    </Link>
  );
}
