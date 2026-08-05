import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { HomeContent } from "./HomeContent";

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
