import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { CheckoutContent } from "./CheckoutContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.checkout");
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates("/checkout"),
  };
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}
