"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";
import { useAuthStore } from "@/lib/store/auth";
import { ADMIN_NAV_ITEMS } from "./adminNav";

const NAV_LINK_CLASSES =
  "rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent";

interface AdminSidebarProps {
  /** Whether the mobile off-canvas drawer is open. Ignored at `lg` and above, where the sidebar is always visible. */
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`bg-surface-secondary border-border fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-55 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-6">
          <div className="flex items-center gap-2">
            <span className="bg-accent size-6.5 rounded" aria-hidden />
            <span className="text-foreground text-lg font-semibold">Technotopia</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="text-foreground hover:bg-surface-hover rounded-md p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1 px-3.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
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
    </>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
