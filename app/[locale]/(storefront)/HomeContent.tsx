"use client";

import { useEffect, useState } from "react";
import type { HomeData } from "@/types/home";
import { useAuthStore } from "@/lib/store/auth";
import { useWishlistStore } from "@/lib/store/wishlist";
import { HeroCarousel } from "@/components/storefront/home/HeroCarousel";
import { StarsSection } from "@/components/storefront/home/StarsSection";
import { BestSellersSection } from "@/components/storefront/home/BestSellersSection";

const EMPTY_HOME_DATA: HomeData = {
  banners: [],
  featuredProducts: [],
  bestSellers: [],
  categories: [],
  brands: [],
};

export function HomeContent() {
  const [data, setData] = useState<HomeData>(EMPTY_HOME_DATA);

  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateWishlist = useWishlistStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateWishlist();
  }, [user, hydrateWishlist]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/storefront/home")
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result?.success) setData(result.data as HomeData);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <HeroCarousel banners={data.banners} />
      <StarsSection products={data.featuredProducts} />
      <section className="mx-auto max-w-320 px-6 py-16" aria-hidden="true" />
      <BestSellersSection
        products={data.bestSellers}
        categories={data.categories}
        brands={data.brands}
      />
    </main>
  );
}
