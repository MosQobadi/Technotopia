"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Chip, Table } from "@heroui/react";
import { StatusPill } from "@/components/admin/DataTable";
import { TextareaField } from "@/components/admin/form";
import { formatPrice } from "@/lib/format";

export interface OrderDetailItemData {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface OrderDetailData {
  id: string;
  customer: { id: string; name: string; email: string; phone: string | null };
  shippingAddress: string;
  postalCode: string;
  items: OrderDetailItemData[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  adminNote: string | null;
}

interface OrderDetailsProps {
  order: OrderDetailData;
  onOrderChange: (order: OrderDetailData) => void;
}

interface ItemColumn {
  key: string;
  label: string;
  render: (item: OrderDetailItemData) => ReactNode;
}

const ITEM_COLUMNS: ItemColumn[] = [
  { key: "productName", label: "Product", render: (item) => item.productName },
  { key: "quantity", label: "Qty", render: (item) => item.quantity },
  { key: "price", label: "Price", render: (item) => formatPrice(item.price) },
  { key: "lineTotal", label: "Total", render: (item) => formatPrice(item.lineTotal) },
];

const ORDER_STATUS_STEPS = [
  { value: "PENDING", label: "Pending" },
  { value: "SENDING", label: "Sending" },
  { value: "SENT", label: "Sent" },
  { value: "DELIVERED", label: "Delivered" },
] as const;

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const noteFormSchema = z.object({
  adminNote: z.string().max(5000, "Note must be 5000 characters or fewer"),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

export function OrderDetails({ order, onOrderChange }: OrderDetailsProps) {
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { adminNote: order.adminNote ?? "" },
  });

  const currentStepIndex = ORDER_STATUS_STEPS.findIndex((step) => step.value === order.status);
  const nextStep =
    currentStepIndex !== -1 && currentStepIndex < ORDER_STATUS_STEPS.length - 1
      ? ORDER_STATUS_STEPS[currentStepIndex + 1]
      : null;

  async function handleNextStep() {
    if (!nextStep) return;
    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStep.value }),
      });
      const result = await response.json();
      if (!result.success) {
        setStatusError(result.error ?? "Failed to update status.");
        return;
      }
      onOrderChange(result.data);
    } catch {
      setStatusError("Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function onSaveNote(values: NoteFormValues) {
    setNoteError(null);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/note`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminNote: values.adminNote }),
      });
      const result = await response.json();
      if (!result.success) {
        setNoteError(result.error ?? "Failed to save note.");
        return;
      }
      onOrderChange(result.data);
    } catch {
      setNoteError("Failed to save note.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href="/admin/orders" className="text-accent text-sm hover:underline">
          ‹ Back to Orders
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-foreground text-xl font-semibold">Order #{order.id}</h1>
          <StatusPill value={titleCase(order.status)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <Card.Header>
              <Card.Title>Items</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-6">
              <Table.Root>
                <Table.ScrollContainer>
                  <Table.Content aria-label="Order items">
                    <Table.Header columns={ITEM_COLUMNS}>
                      {(column) => (
                        <Table.Column key={column.key} isRowHeader={column.key === "productName"}>
                          {column.label}
                        </Table.Column>
                      )}
                    </Table.Header>
                    <Table.Body items={order.items}>
                      {(item) => (
                        <Table.Row key={item.id} columns={ITEM_COLUMNS}>
                          {(column) => <Table.Cell key={column.key}>{column.render(item)}</Table.Cell>}
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table.Root>

              <dl className="ml-auto flex w-full max-w-xs flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="text-foreground">{formatPrice(order.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd className="text-foreground">-{formatPrice(order.discount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="text-foreground">{formatPrice(order.shippingCost)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Tax</dt>
                  <dd className="text-foreground">{formatPrice(order.tax)}</dd>
                </div>
                <div className="border-default flex items-center justify-between border-t pt-2 font-medium">
                  <dt className="text-foreground">Total</dt>
                  <dd className="text-foreground">{formatPrice(order.total)}</dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Order Status</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {ORDER_STATUS_STEPS.map((step, index) => (
                  <div key={step.value} className="flex items-center gap-2">
                    <span
                      className={
                        index <= currentStepIndex
                          ? "text-accent font-medium"
                          : "text-muted"
                      }
                    >
                      {step.label}
                    </span>
                    {index < ORDER_STATUS_STEPS.length - 1 && (
                      <span className="text-muted">→</span>
                    )}
                  </div>
                ))}
              </div>

              {statusError && <p className="text-danger text-sm">{statusError}</p>}

              {nextStep && (
                <Button
                  variant="primary"
                  className="self-start"
                  onPress={handleNextStep}
                  isDisabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Updating..." : "Next Step"}
                </Button>
              )}
            </Card.Content>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <Card.Header>
              <Card.Title>Customer</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-1 text-sm">
              <p className="text-foreground font-medium">{order.customer.name}</p>
              {order.customer.phone && <p className="text-muted">{order.customer.phone}</p>}
              <p className="text-muted">{order.customer.email}</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Shipping Address</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-1 text-sm">
              <p className="text-foreground">{order.shippingAddress}</p>
              <p className="text-muted">Postal code: {order.postalCode}</p>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Payment</Card.Title>
            </Card.Header>
            <Card.Content>
              <Chip variant="soft" size="sm">
                Status: {titleCase(order.paymentStatus)}
              </Chip>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>Admin Note</Card.Title>
            </Card.Header>
            <Card.Content>
              <form
                onSubmit={handleSubmit(onSaveNote)}
                className="flex flex-col gap-3"
              >
                {noteError && <p className="text-danger text-sm">{noteError}</p>}
                <TextareaField
                  control={control}
                  name="adminNote"
                  label="Note"
                  placeholder="Write a note..."
                  rows={4}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="self-start"
                  isDisabled={formState.isSubmitting}
                >
                  {formState.isSubmitting ? "Saving..." : "Save Note"}
                </Button>
              </form>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
