"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Tabs } from "@/components/storefront/ui/Tabs";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { ProfileTab } from "./ProfileTab";
import { OrdersTab } from "./OrdersTab";
import { AddressesTab } from "./AddressesTab";

type AccountTab = "profile" | "orders" | "addresses";

export default function AccountPage() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  const showLoggedOut = !authLoading && !user;

  const accountTabs = [
    { key: "profile", label: t("tabs.profile") },
    { key: "orders", label: t("tabs.orders") },
    { key: "addresses", label: t("tabs.addresses") },
  ] as const;

  return (
    <main className="mx-auto max-w-225 px-6 py-10 pb-24">
      <h1 className="text-ink-900 mb-7 text-[32px] font-extrabold tracking-tight">{t("title")}</h1>

      {showLoggedOut && (
        <EmptyState message={t("loggedOut")} actionLabel={tCommon("logIn")} actionHref="/login" />
      )}

      {user && (
        <>
          <Tabs
            tabs={accountTabs.map(({ key, label }) => ({ key, label }))}
            value={activeTab}
            onChange={(key) => setActiveTab(key as AccountTab)}
            className="mb-8"
          />

          {activeTab === "profile" && <ProfileTab user={user} onSaved={hydrateAuth} />}
          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "addresses" && <AddressesTab />}
        </>
      )}
    </main>
  );
}
