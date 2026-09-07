"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs } from "@/components/storefront/ui/Tabs";
import type { OrderHistoryItem } from "@/server/order.service";
import type { Address } from "@/lib/generated/prisma/client";
import type { SafeUser } from "@/types/auth";
import { ProfileTab } from "./ProfileTab";
import { OrdersTab } from "./OrdersTab";
import { AddressesTab } from "./AddressesTab";

type AccountTab = "profile" | "orders" | "addresses";

interface AccountTabsProps {
  user: SafeUser;
  orders: OrderHistoryItem[];
  addresses: Address[];
}

/**
 * The only thing on this screen that needs a client: which tab is showing. The
 * data below it was read on the server and arrives as props — this component
 * chooses between panels, it does not fetch any of them.
 */
export function AccountTabs({ user, orders, addresses }: AccountTabsProps) {
  const t = useTranslations("account");
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  const accountTabs = [
    { key: "profile", label: t("tabs.profile") },
    { key: "orders", label: t("tabs.orders") },
    { key: "addresses", label: t("tabs.addresses") },
  ];

  return (
    <>
      <Tabs
        tabs={accountTabs}
        value={activeTab}
        onChange={(key) => setActiveTab(key as AccountTab)}
        className="mb-8"
      />

      {activeTab === "profile" && <ProfileTab user={user} />}
      {activeTab === "orders" && <OrdersTab orders={orders} />}
      {activeTab === "addresses" && <AddressesTab initialAddresses={addresses} />}
    </>
  );
}
