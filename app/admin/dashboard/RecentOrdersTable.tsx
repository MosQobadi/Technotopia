"use client";

import { useState } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";

interface RecentOrderRow {
  id: string;
  customer: string;
  date: string;
  total: string;
  status: string;
}

const COLUMNS: DataTableColumn<RecentOrderRow>[] = [
  { key: "id", label: "Order ID" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Date" },
  { key: "total", label: "Total" },
  { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
];

const PAGE_SIZE = 5;

export function RecentOrdersTable() {
  const [page, setPage] = useState(1);

  return (
    <DataTable
      aria-label="Recent orders"
      columns={COLUMNS}
      rows={[]}
      page={page}
      pageSize={PAGE_SIZE}
      total={0}
      onPageChange={setPage}
      emptyMessage="No orders yet."
    />
  );
}
