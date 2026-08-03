"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { Tabs } from "@/components/storefront/ui/Tabs";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { ProfileTab } from "./ProfileTab";
import { OrdersTab } from "./OrdersTab";
import { AddressesTab } from "./AddressesTab";

const ACCOUNT_TABS = [
  { key: "profile", label: "Profile" },
  { key: "orders", label: "Order History" },
  { key: "addresses", label: "Addresses" },
] as const;

type AccountTab = (typeof ACCOUNT_TABS)[number]["key"];

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  const showLoggedOut = !authLoading && !user;

  return (
    <main className="mx-auto max-w-225 px-6 py-10 pb-24">
      <h1 className="mb-7 text-[32px] font-extrabold tracking-tight text-ink-900">My Account</h1>

      {showLoggedOut && (
        <EmptyState message="Log in to view your account." actionLabel="Log In" actionHref="/login" />
      )}

      {user && (
        <>
          <Tabs
            tabs={ACCOUNT_TABS.map(({ key, label }) => ({ key, label }))}
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
