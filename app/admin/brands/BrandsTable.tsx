"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";
import { DeleteBrandAction } from "./DeleteBrandAction";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: "ACTIVE" | "INACTIVE";
  productCount: number;
}

interface BrandsApiResponse {
  success: boolean;
  data?: { brands: BrandRow[]; total: number };
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

export function BrandsTable() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const loadBrands = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/brands?${params}`);
      const result: BrandsApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load brands.");
        return;
      }
      setBrands(result.data.brands);
      setTotal(result.data.total);
    } catch {
      setError("Failed to load brands.");
    }
  }, [page, search, status]);

  useEffect(() => {
    startTransition(loadBrands);
  }, [loadBrands, startTransition]);

  const columns: DataTableColumn<BrandRow>[] = [
    {
      key: "logo",
      label: "Logo",
      render: (row) =>
        row.logo ? (
          // Brand logos may live on hosts not configured in next.config's remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.logo} alt="" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div
            className="bg-surface-secondary border-border flex h-10 w-10 items-center justify-center rounded-md border text-lg"
            aria-hidden
          >
            🖼
          </div>
        ),
    },
    { key: "name", label: "Brand Name" },
    { key: "slug", label: "Slug" },
    { key: "productCount", label: "Products" },
    { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link href={`/admin/brands/${row.id}/edit`} className="text-accent text-sm hover:underline">
            Edit
          </Link>
          <DeleteBrandAction
            brandId={row.id}
            brandName={row.name}
            onDeleted={() => startTransition(loadBrands)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <DataTable
        aria-label="Brands"
        columns={columns}
        rows={brands}
        searchPlaceholder="Search brands..."
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
            href="/admin/brands/add"
            className="bg-accent text-accent-foreground hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            + Add Brand
          </Link>
        }
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading brands..." : "No brands found."}
      />
    </div>
  );
}
