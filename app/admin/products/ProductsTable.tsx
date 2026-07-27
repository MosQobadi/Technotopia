"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";
import { DeleteProductAction } from "./DeleteProductAction";

interface ProductRow {
  id: string;
  name: string;
  image: string | null;
  price: number;
  discountPercent: number;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  category: { id: string; name: string };
  brand: { id: string; name: string };
}

interface Option {
  id: string;
  name: string;
}

interface ProductsApiResponse {
  success: boolean;
  data?: { products: ProductRow[]; total: number };
  error?: string;
}

interface OptionsApiResponse {
  success: boolean;
  data?: Option[];
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

function stockStatusLabel(stock: number) {
  if (stock === 0) return "Out of Stock";
  if (stock < 10) return "Low Stock";
  return "In Stock";
}

export function ProductsTable() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [brandOptions, setBrandOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

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

  const loadProducts = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/products?${params}`);
      const result: ProductsApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load products.");
        return;
      }
      setProducts(result.data.products);
      setTotal(result.data.total);
    } catch {
      setError("Failed to load products.");
    }
  }, [page, search, category, brand, status]);

  useEffect(() => {
    startTransition(loadProducts);
  }, [loadProducts, startTransition]);

  const columns: DataTableColumn<ProductRow>[] = [
    {
      key: "image",
      label: "Image",
      render: (row) =>
        row.image ? (
          // Product images may live on hosts not configured in next.config's remotePatterns.
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
    { key: "name", label: "Name" },
    { key: "category", label: "Category", render: (row) => row.category.name },
    { key: "brand", label: "Brand", render: (row) => row.brand.name },
    { key: "price", label: "Price", render: (row) => `$${row.price.toLocaleString()}` },
    {
      key: "stock",
      label: "Stock",
      render: (row) => <StatusPill value={stockStatusLabel(row.stock)} />,
    },
    {
      key: "discountPercent",
      label: "Discount",
      render: (row) => (row.discountPercent > 0 ? `${row.discountPercent}%` : "—"),
    },
    { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${row.id}/edit`} className="text-accent text-sm hover:underline">
            Edit
          </Link>
          <DeleteProductAction
            productId={row.id}
            productName={row.name}
            onDeleted={(deactivated) => {
              setNotice(
                deactivated
                  ? `"${row.name}" has existing orders and was deactivated instead of deleted.`
                  : null,
              );
              startTransition(loadProducts);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}
      {notice && <p className="text-warning text-sm">{notice}</p>}

      <DataTable
        aria-label="Products"
        columns={columns}
        rows={products}
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
        actions={
          <Link
            href="/admin/products/add"
            className="bg-accent text-accent-foreground hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            + Add Product
          </Link>
        }
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading products..." : "No products found."}
      />
    </div>
  );
}
