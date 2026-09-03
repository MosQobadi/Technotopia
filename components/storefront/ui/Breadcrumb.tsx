import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const t = useTranslations("common");

  return (
    <nav aria-label={t("breadcrumb")} className={cn("text-[13px] text-fg-subtle", className)}>
      {items.map((item, index) => (
        <span key={item.label}>
          {item.href ? (
            <Link href={item.href} className="hover:text-fg text-fg-subtle">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="mx-1.5">/</span>}
        </span>
      ))}
    </nav>
  );
}
