import { cn } from "@/lib/cn";

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
  fullWidth?: boolean;
  className?: string;
}

export function Tabs({ tabs, value, onChange, fullWidth, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "bg-surface-100 flex gap-2 rounded-full p-1.5",
        fullWidth ? "w-full" : "w-fit",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "rounded-full px-5 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
              fullWidth && "flex-1",
              isActive ? "bg-white text-ink-900" : "bg-transparent text-gray-500",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
