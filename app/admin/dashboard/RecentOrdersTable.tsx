"use client";

import { Chip } from "@heroui/react";
import { format } from "date-fns";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";
import { formatPrice } from "@/lib/format";

export interface RecentOrderRow {
  id: string;
  customerName: string;
  isGuest: boolean;
  total: number;
  status: string;
  date: string;
}

interface RecentOrdersTableProps {
  orders: RecentOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const COLUMNS: DataTableColumn<RecentOrderRow>[] = [
  { key: "id", label: "Order ID", render: (row) => `#${row.id}` },
  {
    key: "customerName",
    label: "Customer",
    render: (row) => (
      <span className="inline-flex items-center gap-2">
        {row.customerName}
        {row.isGuest && (
          <Chip variant="soft" size="sm">
            Guest
          </Chip>
        )}
      </span>
    ),
  },
  { key: "date", label: "Date", render: (row) => format(new Date(row.date), "MMM d, yyyy") },
  { key: "total", label: "Total", render: (row) => formatPrice(row.total) },
  { key: "status", label: "Status", render: (row) => <StatusPill value={titleCase(row.status)} /> },
];

export function RecentOrdersTable({
  orders,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading,
}: RecentOrdersTableProps) {
  return (
    <DataTable
      aria-label="Recent orders"
      columns={COLUMNS}
      rows={orders}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      emptyMessage={isLoading ? "Loading orders..." : "No orders yet."}
    />
  );
}
