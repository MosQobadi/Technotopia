import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const SHOP_LINK_KEYS = ["cameras", "microphones", "lights", "speakers", "accessories"] as const;

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="bg-surface-100 border-t border-gray-200">
      <div className="mx-auto grid max-w-320 grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3.5 flex items-center gap-1.5">
            <span className="bg-accent size-2.5 rounded-full" aria-hidden />
            <span className="text-lg font-extrabold tracking-tight text-gray-900">Technotopia</span>
          </div>
          <p className="max-w-70 text-sm leading-relaxed text-gray-500">{t("tagline")}</p>
        </div>

        <div>
          <h3 className="text-label mb-4 text-gray-600">{t("shopHeading")}</h3>
          <div className="flex flex-col gap-2.5">
            {SHOP_LINK_KEYS.map((key) => (
              <Link
                key={key}
                href={`/products?category=${encodeURIComponent(t(`categories.${key}`))}`}
                className="text-sm text-gray-500"
              >
                {t(`categories.${key}`)}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-label mb-4 text-gray-600">{t("supportHeading")}</h3>
          <div className="flex flex-col gap-2.5">
            <Link href="/orders/track" className="text-sm text-gray-500">
              {t("trackOrder")}
            </Link>
            <Link href="#" className="text-sm text-gray-500">
              {t("returns")}
            </Link>
            <Link href="#" className="text-sm text-gray-500">
              {t("shippingInfo")}
            </Link>
            <Link href="mailto:support@technotopia.example" className="text-sm text-gray-500">
              support@technotopia.example
            </Link>
            <span className="text-[13px] text-gray-500" dir="ltr">
              +98 21 0000 0000
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-label mb-4 text-gray-600">{t("visitHeading")}</h3>
          <address className="text-sm leading-loose text-gray-500 not-italic">
            {t("addressLine1")}
            <br />
            {t("addressLine2")}
            <br />
            {t("addressLine3")}
          </address>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-320 flex-wrap items-center justify-between gap-3 px-6 py-5">
          <span className="text-xs text-gray-500">
            {t("copyright", { year: new Date().getFullYear() })}
          </span>
          <div className="flex gap-5">
            <Link href="#" className="text-xs text-gray-600">
              {t("privacy")}
            </Link>
            <Link href="#" className="text-xs text-gray-600">
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
