"use client";

import Link from "next/link";
import { Chip, Input, TextField } from "@heroui/react";
import { format } from "date-fns";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";

interface OrderRow {
  id: string;
  customerName: string;
  itemCount: number;
  total: number;
  status: string;
  paymentStatus: string;
  date: string;
}

interface OrdersApiResponse {
  success: boolean;
  data?: { orders: OrderRow[]; total: number };
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "Pending", value: "PENDING" },
  { label: "Sending", value: "SENDING" },
  { label: "Sent", value: "SENT" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const PAYMENT_OPTIONS = [
  { label: "Unpaid", value: "UNPAID" },
  { label: "Paid", value: "PAID" },
  { label: "Refunded", value: "REFUNDED" },
];

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function OrdersTable() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const loadOrders = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (payment) params.set("payment", payment);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    try {
      const response = await fetch(`/api/admin/orders?${params}`);
      const result: OrdersApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load orders.");
        return;
      }
      setOrders(result.data.orders);
      setTotal(result.data.total);
    } catch {
      setError("Failed to load orders.");
    }
  }, [page, search, status, payment, dateFrom, dateTo]);

  useEffect(() => {
    startTransition(loadOrders);
  }, [loadOrders, startTransition]);

  const columns: DataTableColumn<OrderRow>[] = [
    { key: "id", label: "Order ID", render: (row) => `#${row.id}` },
    { key: "customerName", label: "Customer" },
    { key: "itemCount", label: "Items" },
    { key: "total", label: "Total", render: (row) => `$${row.total.toLocaleString()}` },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill value={titleCase(row.status)} />,
    },
    {
      key: "paymentStatus",
      label: "Payment",
      render: (row) => (
        <Chip variant="soft" size="sm">
          {titleCase(row.paymentStatus)}
        </Chip>
      ),
    },
    { key: "date", label: "Date", render: (row) => format(new Date(row.date), "MMM d, yyyy") },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="text-accent text-sm hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <DataTable
        aria-label="Orders"
        columns={columns}
        rows={orders}
        searchPlaceholder="Search orders..."
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
          {
            label: "Payment",
            value: payment,
            options: PAYMENT_OPTIONS,
            onChange: (value) => {
              setPayment(value);
              setPage(1);
            },
          },
        ]}
        extraFilters={
          <div className="flex items-center gap-2">
            <TextField aria-label="From date">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </TextField>
            <span className="text-muted text-sm">to</span>
            <TextField aria-label="To date">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </TextField>
          </div>
        }
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading orders..." : "No orders found."}
      />
    </div>
  );
}
