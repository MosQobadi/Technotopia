import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function MinimalHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-320 items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="bg-accent size-2.5 rounded-full" aria-hidden />
          <span className="text-lg font-extrabold tracking-tight text-fg">Technotopia</span>
        </Link>
        <div className="flex shrink-0 items-center gap-3.5">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
