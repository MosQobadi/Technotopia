"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { ADMIN_NAV_ITEMS } from "./adminNav";

export function AdminTopbar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const title = ADMIN_NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Admin";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "";

  return (
    <header className="border-border bg-surface flex items-center justify-between border-b px-8 py-5">
      <h1 className="text-foreground text-2xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        {user && <span className="text-foreground text-sm font-medium">{fullName}</span>}
        <div
          className="bg-accent-soft text-accent-soft-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold"
          aria-hidden
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
