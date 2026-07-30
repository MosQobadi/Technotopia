"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

const CHROME_LESS_ROUTES = ["/admin/login"];

export function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (CHROME_LESS_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
