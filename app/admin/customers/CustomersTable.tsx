"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orderCount: number;
  status: string;
}

interface CustomersApiResponse {
  success: boolean;
  data?: { customers: CustomerRow[]; total: number };
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function CustomersTable() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const loadCustomers = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/customers?${params}`);
      const result: CustomersApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load customers.");
        return;
      }
      setCustomers(result.data.customers);
      setTotal(result.data.total);
    } catch {
      setError("Failed to load customers.");
    }
  }, [page, search, status]);

  useEffect(() => {
    startTransition(loadCustomers);
  }, [loadCustomers, startTransition]);

  const columns: DataTableColumn<CustomerRow>[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone", render: (row) => row.phone ?? "—" },
    { key: "orderCount", label: "Orders" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill value={titleCase(row.status)} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Link href={`/admin/customers/${row.id}`} className="text-accent text-sm hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <DataTable
        aria-label="Customers"
        columns={columns}
        rows={customers}
        searchPlaceholder="Search customers..."
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
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading customers..." : "No customers found."}
      />
    </div>
  );
}
