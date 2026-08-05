import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function MinimalHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-320 items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="bg-accent size-2.5 rounded-full" aria-hidden />
          <span className="text-lg font-extrabold tracking-tight text-gray-900">Technotopia</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
