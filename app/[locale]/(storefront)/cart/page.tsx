import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { CartContent } from "./CartContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.cart");
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates("/cart"),
  };
}

export default function CartPage() {
  return <CartContent />;
}
