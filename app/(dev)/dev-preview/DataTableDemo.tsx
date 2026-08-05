"use client";

import { useMemo, useState } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";

interface DemoProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  status: "Active" | "Inactive";
}

const MOCK_PRODUCTS: DemoProduct[] = [
  {
    id: "1",
    name: "Sony A7 IV Camera",
    category: "Cameras",
    price: 2499,
    stockStatus: "In Stock",
    status: "Active",
  },
  {
    id: "2",
    name: "Boya BY-M1 Lavalier Mic",
    category: "Microphones",
    price: 19,
    stockStatus: "Low Stock",
    status: "Active",
  },
  {
    id: "3",
    name: "Canon EOS R6",
    category: "Cameras",
    price: 2299,
    stockStatus: "Out of Stock",
    status: "Inactive",
  },
  {
    id: "4",
    name: 'Roads Ring Light 18"',
    category: "Lights",
    price: 89,
    stockStatus: "In Stock",
    status: "Active",
  },
  {
    id: "5",
    name: "Sony ECM-B1M Shotgun Mic",
    category: "Microphones",
    price: 349,
    stockStatus: "In Stock",
    status: "Active",
  },
  {
    id: "6",
    name: "Canon RF 24-70mm Lens",
    category: "Cameras",
    price: 1899,
    stockStatus: "Low Stock",
    status: "Active",
  },
  {
    id: "7",
    name: "Boya BY-MM1 Shotgun Mic",
    category: "Microphones",
    price: 59,
    stockStatus: "Out of Stock",
    status: "Inactive",
  },
  {
    id: "8",
    name: "Roads Softbox Kit",
    category: "Lights",
    price: 149,
    stockStatus: "In Stock",
    status: "Active",
  },
];

const COLUMNS: DataTableColumn<DemoProduct>[] = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  {
    key: "price",
    label: "Price",
    render: (row) => `$${row.price.toLocaleString()}`,
  },
  {
    key: "stockStatus",
    label: "Stock",
    render: (row) => <StatusPill value={row.stockStatus} />,
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusPill value={row.status} />,
  },
];

const PAGE_SIZE = 4;

export function DataTableDemo() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "" || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DataTable
      aria-label="Demo products"
      columns={COLUMNS}
      rows={paged}
      searchPlaceholder="Search products..."
      onSearch={(query) => {
        setSearch(query);
        setPage(1);
      }}
      filters={[
        {
          label: "Status",
          value: statusFilter,
          options: [
            { label: "Active", value: "Active" },
            { label: "Inactive", value: "Inactive" },
          ],
          onChange: (value) => {
            setStatusFilter(value);
            setPage(1);
          },
        },
      ]}
      page={page}
      pageSize={PAGE_SIZE}
      total={filtered.length}
      onPageChange={setPage}
    />
  );
}
