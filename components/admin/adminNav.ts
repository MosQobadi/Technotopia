export interface AdminNavItem {
  label: string;
  href: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Brands", href: "/admin/brands" },
  { label: "Content", href: "/admin/content/banners" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Settings", href: "/admin/settings" },
];
