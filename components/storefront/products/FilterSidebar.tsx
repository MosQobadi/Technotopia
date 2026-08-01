import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontFilterOption } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export const PRICE_RANGE_MIN = 0;
export const PRICE_RANGE_MAX = 90_000_000;
export const PRICE_RANGE_STEP = 500_000;

const STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
];

interface FilterSidebarProps {
  categories: StorefrontFilterOption[];
  activeCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  brands: StorefrontFilterOption[];
  selectedBrandIds: Set<string>;
  onBrandToggle: (brandId: string) => void;
  maxPrice: number;
  onMaxPriceInput: (value: number) => void;
  onMaxPriceCommit: (value: number) => void;
  selectedStatuses: Set<InventoryStatus>;
  onStatusToggle: (status: InventoryStatus) => void;
}

export function FilterSidebar({
  categories,
  activeCategoryId,
  onCategoryChange,
  brands,
  selectedBrandIds,
  onBrandToggle,
  maxPrice,
  onMaxPriceInput,
  onMaxPriceCommit,
  selectedStatuses,
  onStatusToggle,
}: FilterSidebarProps) {
  return (
    <aside className="bg-surface-100 sticky top-22 h-fit rounded-[20px] p-6">
      <div className="mb-7">
        <h2 className="mb-3.5 text-[13px] font-bold text-gray-600">Category</h2>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={cn(
              "text-left text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
              activeCategoryId === null ? "text-accent font-bold" : "text-ink-900 font-normal",
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "text-left text-sm outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                activeCategoryId === category.id
                  ? "text-accent font-bold"
                  : "text-ink-900 font-normal",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-7">
        <h2 className="mb-3.5 text-[13px] font-bold text-gray-600">Brand</h2>
        <div className="flex flex-col gap-2.5">
          {brands.map((brand) => (
            <label key={brand.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedBrandIds.has(brand.id)}
                onChange={() => onBrandToggle(brand.id)}
                className="accent-accent"
              />
              {brand.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-7">
        <h2 className="mb-3.5 text-[13px] font-bold text-gray-600">Price range</h2>
        <input
          type="range"
          min={PRICE_RANGE_MIN}
          max={PRICE_RANGE_MAX}
          step={PRICE_RANGE_STEP}
          value={maxPrice}
          onChange={(event) => onMaxPriceInput(Number(event.target.value))}
          onMouseUp={(event) => onMaxPriceCommit(Number(event.currentTarget.value))}
          onTouchEnd={(event) => onMaxPriceCommit(Number(event.currentTarget.value))}
          onKeyUp={(event) => onMaxPriceCommit(Number(event.currentTarget.value))}
          aria-label="Maximum price"
          className="accent-accent w-full"
        />
        <div className="mt-2 font-mono text-xs text-gray-500">Up to {formatPrice(maxPrice)}</div>
      </div>

      <div>
        <h2 className="mb-3.5 text-[13px] font-bold text-gray-600">Status</h2>
        <div className="flex flex-col gap-2.5">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedStatuses.has(option.value)}
                onChange={() => onStatusToggle(option.value)}
                className="accent-accent"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
