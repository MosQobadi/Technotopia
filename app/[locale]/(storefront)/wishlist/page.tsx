import { getTranslations } from "next-intl/server";
import { getSessionPayload } from "@/lib/auth/session";
import { getWishlist } from "@/server/wishlist.service";
import { navTrail } from "@/components/storefront/navLinks";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { WishlistGrid } from "./WishlistGrid";

// Reading the session below already makes this route dynamic, but it is spelled
// out because the failure mode if it ever weren't is serving one customer's
// saved items to everyone out of the cache.
export const dynamic = "force-dynamic";

// Read through the service layer directly rather than through this app's own
// GET /api/storefront/wishlist — the same function that route serves, minus an
// HTTP round-trip to ourselves and minus the empty grid that used to sit there
// until it came back. The route stays: the hearts on the rest of the storefront
// are client-side, and it is what they read.
export default async function WishlistPage() {
  const t = await getTranslations("wishlist");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const payload = await getSessionPayload();
  const items = payload ? await getWishlist(payload.userId) : null;

  return (
    <main className="mx-auto max-w-320 px-6 py-10 pb-24">
      <Breadcrumb items={navTrail("wishlist", tNav)} className="mb-5" />
      <h1 className="text-fg text-title mb-8">{t("title")}</h1>

      {items ? (
        <WishlistGrid initialItems={items} />
      ) : (
        <EmptyState
          message={t("loggedOut")}
          actionLabel={tCommon("logIn")}
          actionHref="/login?next=/wishlist"
        />
      )}
    </main>
  );
}
