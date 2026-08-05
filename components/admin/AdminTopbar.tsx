"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { ADMIN_NAV_ITEMS } from "./adminNav";

interface AdminTopbarProps {
  onMenuPress: () => void;
}

export function AdminTopbar({ onMenuPress }: AdminTopbarProps) {
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
    <header className="border-border bg-surface flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuPress}
          className="text-foreground hover:bg-surface-hover -ml-1.5 rounded-md p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
        >
          <MenuIcon />
        </button>
        <h1 className="text-foreground truncate text-lg font-semibold sm:text-xl lg:text-2xl">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {user && (
          <span className="text-foreground hidden text-sm font-medium sm:inline">{fullName}</span>
        )}
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
