import { getTranslations } from "next-intl/server";
import { getSessionPayload } from "@/lib/auth/session";
import { getAddresses, getProfile } from "@/server/account.service";
import { getOrderHistoryForCustomer } from "@/server/order.service";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { AccountTabs } from "./AccountTabs";

// Reading the session below already makes this route dynamic, but it is spelled
// out because the failure mode if it ever weren't is serving one customer's
// profile, orders and addresses to everyone out of the cache.
export const dynamic = "force-dynamic";

// Profile, order history and addresses are read through the service layer
// directly rather than through this app's own /api/storefront/* routes — the
// same functions those routes serve, minus three HTTP round-trips to ourselves
// that would each have to forward the session cookie to be let in, and minus
// the three separate spinners that came with fetching them from the client.
// The routes stay: they are still the contract for client callers.
export default async function AccountPage() {
  const t = await getTranslations("account");
  const tCommon = await getTranslations("common");

  const payload = await getSessionPayload();

  // A token for an account that no longer exists is not a session: a null
  // profile falls through to the same logged-out state as no token at all.
  const user = payload ? await getProfile(payload.userId) : null;

  // Three independent reads for one screen — issued together rather than
  // awaited one after another, so the page costs one round-trip's worth of
  // latency and not three.
  const [orders, addresses] = user
    ? await Promise.all([getOrderHistoryForCustomer(user.id), getAddresses(user.id)])
    : [[], []];

  return (
    <main className="mx-auto max-w-225 px-6 py-10 pb-24">
      <h1 className="text-fg text-title mb-7">{t("title")}</h1>

      {user ? (
        <AccountTabs user={user} orders={orders} addresses={addresses} />
      ) : (
        <EmptyState message={t("loggedOut")} actionLabel={tCommon("logIn")} actionHref="/login" />
      )}
    </main>
  );
}
