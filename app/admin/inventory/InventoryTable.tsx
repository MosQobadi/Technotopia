"use client";

import { Button } from "@heroui/react";
import { format } from "date-fns";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";
import type { InventoryStatus } from "@/types/inventory";
import { StockEditModal } from "./StockEditModal";

interface InventoryItem {
  productId: string;
  name: string;
  sku: string;
  category: { id: string; name: string };
  brand: { id: string; name: string };
  stock: number;
  status: InventoryStatus;
  lastUpdatedAt: string | null;
}

interface InventoryRow extends InventoryItem {
  id: string;
}

interface Option {
  id: string;
  name: string;
}

interface InventoryApiResponse {
  success: boolean;
  data?: { items: InventoryItem[]; total: number };
  error?: string;
}

interface OptionsApiResponse {
  success: boolean;
  data?: Option[];
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<InventoryStatus, string> = {
  OUT_OF_STOCK: "Out of Stock",
  LOW_STOCK: "Low Stock",
  IN_STOCK: "In Stock",
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as InventoryStatus[]).map((value) => ({
  label: STATUS_LABELS[value],
  value,
}));

export function InventoryTable() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<InventoryRow | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const [categoryRes, brandRes] = await Promise.all([
        fetch("/api/admin/categories/options"),
        fetch("/api/admin/brands/options"),
      ]);
      const categoryResult: OptionsApiResponse = await categoryRes.json();
      const brandResult: OptionsApiResponse = await brandRes.json();
      if (categoryResult.success && categoryResult.data) setCategoryOptions(categoryResult.data);
      if (brandResult.success && brandResult.data) setBrandOptions(brandResult.data);
    }
    loadOptions();
  }, []);

  const loadInventory = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/inventory?${params}`);
      const result: InventoryApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load inventory.");
        return;
      }
      setItems(result.data.items.map((item) => ({ ...item, id: item.productId })));
      setTotal(result.data.total);
    } catch {
      setError("Failed to load inventory.");
    }
  }, [page, search, category, brand, status]);

  useEffect(() => {
    startTransition(loadInventory);
  }, [loadInventory, startTransition]);

  const columns: DataTableColumn<InventoryRow>[] = [
    { key: "name", label: "Product" },
    { key: "category", label: "Category", render: (row) => row.category.name },
    { key: "brand", label: "Brand", render: (row) => row.brand.name },
    { key: "stock", label: "Stock" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill value={STATUS_LABELS[row.status]} />,
    },
    {
      key: "lastUpdatedAt",
      label: "Last Update",
      render: (row) =>
        row.lastUpdatedAt ? format(new Date(row.lastUpdatedAt), "MMM d, yyyy") : "—",
    },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <Button variant="ghost" size="sm" onPress={() => setEditingItem(row)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <DataTable
        aria-label="Inventory"
        columns={columns}
        rows={items}
        searchPlaceholder="Search products..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filters={[
          {
            label: "Category",
            value: category,
            options: categoryOptions.map((option) => ({ label: option.name, value: option.id })),
            onChange: (value) => {
              setCategory(value);
              setPage(1);
            },
          },
          {
            label: "Brand",
            value: brand,
            options: brandOptions.map((option) => ({ label: option.name, value: option.id })),
            onChange: (value) => {
              setBrand(value);
              setPage(1);
            },
          },
          {
            label: "Status",
            value: status,
            options: STATUS_OPTIONS,
            onChange: (value) => {
              setStatus(value);
              setPage(1);
            },
          },
        ]}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading inventory..." : "No inventory items found."}
      />

      <StockEditModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={() => startTransition(loadInventory)}
      />
    </div>
  );
}
