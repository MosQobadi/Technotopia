"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import type { HomeBannerView } from "@/types/home";
import { Button } from "@/components/storefront/ui/Button";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";

const ROTATE_INTERVAL_MS = 6000;

export function HeroCarousel({ banners }: { banners: HomeBannerView[] }) {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setSlideIndex((current) => (current + 1) % banners.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const slide = banners[slideIndex]!;

  function goTo(index: number) {
    setSlideIndex((index + banners.length) % banners.length);
  }

  return (
    <section className="bg-surface-100">
      <div className="mx-auto grid max-w-320 items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          {slide.tag && <SectionEyebrow label={slide.tag} className="mb-4" />}
          <h1 className="mb-4.5 text-[48px] leading-[1.05] font-extrabold tracking-tight text-ink-900">
            {slide.headline}
          </h1>
          {slide.subcopy && (
            <p className="mb-7 max-w-115 text-base leading-relaxed text-gray-500">{slide.subcopy}</p>
          )}
          {slide.cta && (
            <Button variant="primary" href={slide.cta.href}>
              {slide.cta.label} →
            </Button>
          )}
          {banners.length > 1 && (
            <div className="mt-8 flex gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => goTo(index)}
                  className={cn(
                    "h-1.5 cursor-pointer rounded-full outline-none transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                    index === slideIndex ? "bg-accent w-7" : "w-2.5 bg-gray-300",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-200 relative aspect-4/3 overflow-hidden rounded-3xl">
          {slide.image ? (
            <Image src={slide.image} alt={slide.headline} fill className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-mono text-[13px] text-gray-500">
              HERO PRODUCT PHOTO
            </div>
          )}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => goTo(slideIndex - 1)}
                className="absolute top-1/2 left-3.5 flex size-9.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-base outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => goTo(slideIndex + 1)}
                className="absolute top-1/2 right-3.5 flex size-9.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-base outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                →
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
