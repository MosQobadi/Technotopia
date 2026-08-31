import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { HomeContent } from "./HomeContent";

// ISR: the home shell is identical for every visitor, so it is prerendered and
// re-generated at most every 5 minutes. Per-user state (auth, wishlist) and the
// merchandising data are fetched client-side, so a cached shell never serves
// one visitor another's data or a stale product list.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.home");
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates("/"),
  };
}

export default function HomePage() {
  return <HomeContent />;
}
