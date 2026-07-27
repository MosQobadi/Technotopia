"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Button, Card, Table } from "@heroui/react";
import { StatusPill } from "@/components/admin/DataTable";

export interface CustomerOrderData {
  id: string;
  itemCount: number;
  total: number;
  status: string;
  date: string;
}

export interface CustomerDetailData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  orderCount: number;
  createdAt: string;
  orders: CustomerOrderData[];
}

interface CustomerDetailsProps {
  customer: CustomerDetailData;
  onCustomerChange: (customer: CustomerDetailData) => void;
}

interface OrderColumn {
  key: string;
  label: string;
  render: (order: CustomerOrderData) => ReactNode;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const ORDER_COLUMNS: OrderColumn[] = [
  { key: "id", label: "Order ID", render: (order) => `#${order.id}` },
  { key: "itemCount", label: "Items", render: (order) => order.itemCount },
  { key: "total", label: "Total", render: (order) => formatCurrency(order.total) },
  {
    key: "status",
    label: "Status",
    render: (order) => <StatusPill value={titleCase(order.status)} />,
  },
  { key: "date", label: "Date", render: (order) => format(new Date(order.date), "MMM d, yyyy") },
];

export function CustomerDetails({ customer, onCustomerChange }: CustomerDetailsProps) {
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const nextStatus = customer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  async function handleToggleStatus() {
    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!result.success) {
        setStatusError(result.error ?? "Failed to update status.");
        return;
      }
      onCustomerChange({ ...customer, ...result.data });
    } catch {
      setStatusError("Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const contactLine = [customer.email, customer.phone].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href="/admin/customers" className="text-accent text-sm hover:underline">
          ‹ Back to Customers
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-foreground text-xl font-semibold">{customer.name}</h1>
          <StatusPill value={titleCase(customer.status)} />
        </div>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Profile</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-foreground">{contactLine}</p>
            <p className="text-muted">
              Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
            </p>
          </div>

          {statusError && <p className="text-danger text-sm">{statusError}</p>}

          <Button
            variant="secondary"
            className="self-start"
            onPress={handleToggleStatus}
            isDisabled={isUpdatingStatus}
          >
            {isUpdatingStatus
              ? "Updating..."
              : nextStatus === "ACTIVE"
                ? "Activate"
                : "Deactivate"}
          </Button>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Order History</Card.Title>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.ScrollContainer>
              <Table.Content aria-label="Order history">
                <Table.Header columns={ORDER_COLUMNS}>
                  {(column) => (
                    <Table.Column key={column.key} isRowHeader={column.key === "id"}>
                      {column.label}
                    </Table.Column>
                  )}
                </Table.Header>
                <Table.Body items={customer.orders} renderEmptyState={() => "No orders yet."}>
                  {(order) => (
                    <Table.Row key={order.id} columns={ORDER_COLUMNS}>
                      {(column) => <Table.Cell key={column.key}>{column.render(order)}</Table.Cell>}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table.Root>
        </Card.Content>
      </Card>
    </div>
  );
}
