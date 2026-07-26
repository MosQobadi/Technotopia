"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { useAuthStore } from "@/lib/store/auth";
import { ADMIN_NAV_ITEMS } from "./adminNav";

const NAV_LINK_CLASSES =
  "rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function AdminSidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);

  return (
    <aside className="bg-surface-secondary border-border flex w-55 shrink-0 flex-col border-r">
      <div className="flex items-center gap-2 px-4 py-6">
        <span className="bg-accent size-6.5 rounded" aria-hidden />
        <span className="text-foreground text-lg font-semibold">Technotopia</span>
      </div>

      <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1 px-3.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`${NAV_LINK_CLASSES} ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-border border-t px-3.5 py-4">
        <Button variant="outline" fullWidth onPress={() => logout()}>
          Logout
        </Button>
      </div>
    </aside>
  );
}
