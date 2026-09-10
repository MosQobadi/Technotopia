import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { BreadcrumbTrailItem } from "@/lib/seo";

interface BreadcrumbProps {
  /** Built by `navTrail`, which leaves the last item — the current page — unlinked. */
  items: BreadcrumbTrailItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const t = useTranslations("common");

  return (
    <nav aria-label={t("breadcrumb")} className={cn("text-[13px] text-fg-subtle", className)}>
      <ol className="flex flex-wrap items-center gap-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="mx-1.5">
                /
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-fg focus-visible:outline-accent-readable rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
