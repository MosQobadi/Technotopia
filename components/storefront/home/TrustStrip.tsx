import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { MailIcon, PhoneIcon } from "@/components/storefront/icons";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { formatPrice } from "@/lib/format";
import { STANDARD_DELIVERY_COST } from "@/lib/storefront/delivery";
import type { PublicSettings } from "@/server/settings.service";

const HEADING_ID = "trust-heading";

// The last band before the footer, and the page's only section that makes a
// promise rather than showing a product. Which is exactly why every line on it
// is read from something the shop actually runs on:
//
//   • the delivery price is `STANDARD_DELIVERY_COST`, the one constant the
//     checkout summary adds and `createOrder` writes onto the row — so the
//     figure here is the figure charged;
//   • the payment line names the two methods CheckoutContent actually offers
//     (the `PaymentMethod` enum: CARD, BANK_TRANSFER);
//   • the contact details come from Settings, and a blank field drops its line
//     instead of printing an empty one — the rule StorefrontFooter follows.
//
// A returns window would have been the natural third claim, and there is
// nowhere in Settings, the schema or the order flow that encodes one. So the
// strip doesn't make it. A promise with nothing behind it is the decoration
// this section exists to avoid.
export async function TrustStrip({ settings }: { settings: PublicSettings }) {
  const t = await getTranslations("home.trust");
  const { storeName, supportPhone, supportEmail } = settings;

  const hasContact = supportPhone.trim() !== "" || supportEmail.trim() !== "";
  const storeNameSet = storeName.trim() !== "";

  return (
    <section aria-labelledby={HEADING_ID} className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <SectionEyebrow label={t("eyebrow")} />
      <h2 id={HEADING_ID} className="text-fg text-title mb-8">
        {storeNameSet ? t("headingNamed", { storeName }) : t("heading")}
      </h2>

      {/* A rule above each claim rather than between them: at `md` the three
          caps line up as one hairline broken into three, and stacked on a phone
          each claim still arrives under its own rule. Both readings work in RTL
          without a single directional class. */}
      <ul className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
        <TrustClaim title={t("delivery.title")} body={t("delivery.body")}>
          {/* The figure is its own line rather than a word in the sentence
              above it. `formatPrice` prints Persian digits and the ریال suffix
              in both locales, so inside an English paragraph the bidi algorithm
              reorders the run and shunts the suffix against the next Latin word
              with no gap. On its own element the run is isolated and sets the
              way Persian currency should. It reads better as a figure, too:
              this is the one claim on the strip that carries a number. */}
          <p className="text-fg-subtle text-xs">{t("delivery.amountLabel")}</p>
          <p className="text-fg text-subhead">{formatPrice(STANDARD_DELIVERY_COST)}</p>
        </TrustClaim>

        <TrustClaim title={t("payment.title")} body={t("payment.body")} />

        {hasContact && (
          <TrustClaim title={t("support.title")} body={t("support.body")}>
            {supportPhone.trim() !== "" && (
              // Admins type phone numbers with spacing so they read; a tel: URI
              // can't carry it.
              <ContactLink
                href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                label={supportPhone}
                icon={<PhoneIcon className="size-4 shrink-0" />}
              />
            )}
            {supportEmail.trim() !== "" && (
              <ContactLink
                href={`mailto:${supportEmail}`}
                label={supportEmail}
                icon={<MailIcon className="size-4 shrink-0" />}
              />
            )}
          </TrustClaim>
        )}
      </ul>
    </section>
  );
}

function TrustClaim({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <li className="border-line border-t pt-5">
      {/* h3, not h2: the band's own heading is above all three, and three
          sibling h2s under it would flatten the outline a screen reader reads. */}
      <h3 className="text-fg text-subhead mb-1.5">{title}</h3>
      <p className="text-fg-subtle text-sm leading-relaxed text-pretty">{body}</p>
      {children && <div className="mt-2 flex flex-col items-start">{children}</div>}
    </li>
  );
}

function ContactLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      className="text-accent-readable focus-visible:outline-accent-readable inline-flex min-h-11 items-center gap-2 rounded text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {icon}
      {/* A number and an address are Latin either way round, so they keep their
          own direction inside the Persian tree. */}
      <span dir="ltr">{label}</span>
    </a>
  );
}
