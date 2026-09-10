import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { HomeCategoryView } from "@/types/home";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { categoryListHref } from "@/lib/storefront/plp";

const HEADING_ID = "categories-heading";

// The shelf of categories, and the one section on the home page whose images
// are handled the *opposite* way from a product's.
//
// A ProductCard puts its photograph in a well and its words underneath, on the
// card's own ground. A category card has no such division: the photograph is
// the card, edge to edge, and the name sits on top of it. That contrast is the
// whole point — a customer never has to read a card to know whether it is one
// thing to buy or a whole shelf of them, because the two do not look alike at
// any distance.
//
// ── Drawing on a photograph ──
// Text over an admin-uploaded image has no palette to lean on: the photograph
// could be a black camera body or a white softbox, and the storefront's own
// theme has no say in which. So the ground under the words is not the
// photograph, it is `bg-scrim` — black at the alpha that makes the composite
// dark enough for AA *whatever* is beneath it (the arithmetic is beside
// --app-scrim in app/globals.css). Everything drawn on it is therefore a token
// that does not flip either: `accent-foreground` for the name, and
// `accent-on-dark` — the lighter blue that exists precisely for ground like
// this — for the call to action. `accent-readable` must not appear here; in
// the light theme it is the signal blue, which on this ground is unreadable.
//
// This is a server component: a card is a photograph, a name and a link, and
// none of the three needs the client.
export async function CategoryBrowseSection({ categories }: { categories: HomeCategoryView[] }) {
  // A shop with no categories has nothing to browse — no heading over an empty
  // grid, same stance the deals rail takes.
  if (categories.length === 0) return null;

  const t = await getTranslations("home.categories");

  return (
    <section aria-labelledby={HEADING_ID} className="mx-auto max-w-320 px-6 pt-18 pb-10">
      <SectionEyebrow label={t("eyebrow")} />
      <h2 id={HEADING_ID} className="text-fg text-title mb-8">
        {t("heading")}
      </h2>

      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryCard category={category} cta={t("cta")} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryCard({ category, cta }: { category: HomeCategoryView; cta: string }) {
  return (
    <Link
      href={categoryListHref(category.slug)}
      // The focus ring is offset outward, onto the page's own ground rather
      // than onto the photograph — which is why this is the one token here that
      // flips with the theme.
      className="group focus-visible:outline-accent-readable relative block aspect-4/5 overflow-hidden rounded-[20px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* The ground behind the photograph, and the whole card when a category
          has none yet. The scrim reads the same over either, so a category
          without a picture is a plainer card, not a broken one. */}
      <div className="bg-surface-muted absolute inset-0">
        {category.image && (
          <Image
            src={category.image}
            // Decorative: the name is in the same link, a line below.
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
          />
        )}
      </div>

      {/* Opaque scrim across the bottom half, where the words are, fading out
          over the top half so the photograph still reads as a photograph. The
          stop is a *hard* one at the halfway mark: a gradient still fading
          under the text would put a two-line name's first line on a lighter
          ground than its second, and only one of the two would be the certified
          ratio.

          With no photograph there is nothing to fade over, and a gradient run
          across bare `surface-muted` reads as a broken image rather than as an
          absent one — so that card takes the scrim flat and is simply a dark
          tile with a name on it. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0",
          category.image ? "from-scrim bg-linear-to-t from-50% to-transparent" : "bg-scrim",
        )}
      />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <span className="text-accent-foreground text-subhead block text-balance">
          {category.name}
        </span>
        <span className="text-accent-on-dark text-label mt-1 flex items-center gap-1.5">
          {cta}
          {/* A glyph, not an icon, so it turns around with the reading
              direction the way the hero's and the rail's do. */}
          <span aria-hidden className="rtl:-scale-x-100">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
