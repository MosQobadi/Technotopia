import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminChrome } from "@/components/admin/AdminChrome";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Technotopia Admin",
  description: "Admin panel for the Technotopia e-commerce platform.",
  robots: { index: false, follow: false },
};

// Admin has no locale of its own — always English/LTR. This is a separate
// root layout (rather than nesting under the single app-wide root) so that
// the storefront's [locale] segment can set its own <html lang>/dir directly
// from route params without forcing the whole app into dynamic rendering.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AdminChrome>{children}</AdminChrome>
      </body>
    </html>
  );
}
