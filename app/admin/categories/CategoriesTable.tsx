"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";
import { DeleteCategoryAction } from "./DeleteCategoryAction";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: "ACTIVE" | "INACTIVE";
  productCount: number;
}

interface CategoriesApiResponse {
  success: boolean;
  data?: { categories: CategoryRow[]; total: number };
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

export function CategoriesTable() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const loadCategories = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/categories?${params}`);
      const result: CategoriesApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load categories.");
        return;
      }
      setCategories(result.data.categories);
      setTotal(result.data.total);
    } catch {
      setError("Failed to load categories.");
    }
  }, [page, search, status]);

  useEffect(() => {
    startTransition(loadCategories);
  }, [loadCategories, startTransition]);

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: "image",
      label: "Image",
      render: (row) =>
        row.image ? (
          // Category images may live on hosts not configured in next.config's remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.image} alt="" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div
            className="bg-surface-secondary border-border flex h-10 w-10 items-center justify-center rounded-md border text-lg"
            aria-hidden
          >
            🖼
          </div>
        ),
    },
    { key: "name", label: "Category Name" },
    { key: "slug", label: "Slug" },
    { key: "productCount", label: "Products" },
    { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/categories/${row.id}/edit`}
            className="text-accent text-sm hover:underline"
          >
            Edit
          </Link>
          <DeleteCategoryAction
            categoryId={row.id}
            categoryName={row.name}
            onDeleted={() => startTransition(loadCategories)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <DataTable
        aria-label="Categories"
        columns={columns}
        rows={categories}
        searchPlaceholder="Search categories..."
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filters={[
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
        actions={
          <Link
            href="/admin/categories/add"
            className="bg-accent text-accent-foreground hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            + Add Category
          </Link>
        }
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading categories..." : "No categories found."}
      />
    </div>
  );
}
