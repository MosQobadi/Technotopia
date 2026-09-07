import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { HomeBannerView } from "@/types/home";
import { Button } from "@/components/storefront/ui/Button";
import { HeroRotator } from "./HeroRotator";

// The home page's opening band, built from the Banner rows an admin manages.
//
// This is a *server* component, and that is the point of the file. What used to
// be here was one `"use client"` carousel that owned the whole band, which made
// the page's LCP element — the first banner's photograph and headline — part of
// a client bundle. The markup was still server-rendered, but the composition
// said the opposite of what we wanted, and every later change to the rotation
// pulled more of the band across the boundary with it.
//
// So the split runs the other way now: the slides are server-rendered here and
// handed to HeroRotator as children. The island underneath decides which child
// is visible and draws the controls; it never renders a slide. With a single
// banner — the common case, since nothing seeds this table — the island is not
// mounted at all and the hero ships zero client JavaScript.
//
// ── The ground ──
// The band is painted `bg-accent-solid`, which is one of the three accent
// tokens that deliberately do *not* flip between themes (see the note beside
// --app-accent-solid in app/globals.css). That is what makes the hero the one
// surface on the storefront that is dark whatever the theme is: white on this
// blue is 5.10:1 in light *and* dark, already certified by the palette, so the
// band needs no second set of values and no per-theme checking.
//
// So every piece of text here is `accent-foreground` — the literal white — at
// full strength, and the ranks come from size, weight and tracking instead of
// from opacity. That is not a stylistic preference: the eyebrow and the line of
// copy were first written at /80 and /85, which measure 3.83 and 4.13 on this
// blue and fail AA. An alpha is allowed only on things that carry no text — the
// eyebrow's rule, the inactive dots, the arrows' hairline.
//
// `accent-readable` must not appear anywhere inside this section: it resolves
// to the signal blue in the light theme, which on this ground is blue on blue.
export async function HomeHero({ banners }: { banners: HomeBannerView[] }) {
  if (banners.length === 0) return null;

  const t = await getTranslations("home.hero");

  const slides = banners.map((banner, index) => (
    <HeroSlide key={banner.id} banner={banner} eager={index === 0} />
  ));

  return (
    <section aria-label={t("region")} className="bg-accent-solid text-accent-foreground">
      <div className="mx-auto max-w-320 px-6 py-14 sm:py-16">
        {slides.length === 1 ? (
          slides[0]
        ) : (
          <HeroRotator
            labels={{
              previous: t("previousSlide"),
              next: t("nextSlide"),
              goTo: banners.map((_, index) => t("goToSlide", { number: index + 1 })),
            }}
          >
            {slides}
          </HeroRotator>
        )}
      </div>
    </section>
  );
}

// One banner, whole: eyebrow, headline, a line of copy, one call to action, and
// the photograph the admin uploaded.
//
// `eager` is true for the first slide only. It is the LCP image, so it gets
// `priority`; the rest stay lazy, and because HeroRotator hides an inactive
// slide with the `hidden` attribute rather than with opacity, the browser does
// not fetch those photographs until the slide is actually shown. Three banners
// is still one image on first paint.
function HeroSlide({ banner, eager }: { banner: HomeBannerView; eager: boolean }) {
  return (
    <div className="grid items-center gap-9 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div>
        {banner.tag && (
          <p className="text-label mb-4 flex items-center gap-2.5 tracking-[0.14em] uppercase">
            {/* Decorative, so it is the one thing on the band allowed to sit
                below the text ratios. */}
            <span aria-hidden className="bg-accent-foreground/50 h-px w-7 shrink-0" />
            {banner.tag}
          </p>
        )}

        {/* One headline, and it steps down rather than wrapping to four lines:
            text-display is 48px, which at 375px leaves a two-word line. The
            title step carries the same weight and tracking, so the drop is in
            size only. */}
        <h1 className="text-title sm:text-display mb-4.5 text-balance">{banner.headline}</h1>

        {banner.subcopy && (
          <p className="mb-7 max-w-115 text-base leading-relaxed text-pretty">{banner.subcopy}</p>
        )}

        {/* One call to action. The arrow is a glyph rather than an icon, so it
            has to be turned around in the Farsi tree along with the reading
            direction. */}
        {banner.cta && (
          <Button variant="on-accent" href={banner.cta.href}>
            {banner.cta.label}
            <span aria-hidden className="rtl:-scale-x-100">
              →
            </span>
          </Button>
        )}
      </div>

      {/* The photograph sits in a well a shade deeper than the band — that is
          the accent's own hover fill, which is the other non-flipping accent
          token, so the well is identical in both themes too. */}
      <div className="bg-accent-solid-hover relative aspect-4/3 overflow-hidden rounded-3xl">
        {banner.image ? (
          <Image
            src={banner.image}
            // Decorative. The banner's message is the <h1> beside it, and the
            // alt this replaces was that same headline repeated — which a
            // screen reader then read out twice.
            alt=""
            fill
            // Full width below lg, where the section stacks to one column; above
            // it the image is the narrower half of the 1.05fr/1fr grid inside
            // max-w-320.
            sizes="(max-width: 1024px) 100vw, 600px"
            className="object-cover"
            priority={eager}
            loading={eager ? undefined : "lazy"}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[13px]">
            HERO PRODUCT PHOTO
          </div>
        )}
      </div>
    </div>
  );
}
