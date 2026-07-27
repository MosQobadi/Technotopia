import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import type { PaymentStatus } from "@/lib/generated/prisma/enums";

const ORDER_LIST_INCLUDE = {
  customer: { select: { firstName: true, lastName: true } },
  items: { select: { id: true } },
} as const;

type OrderWithListRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_LIST_INCLUDE }>;

export interface OrderListItem {
  id: string;
  customerName: string;
  itemCount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  date: Date;
}

function toListItem(order: OrderWithListRelations): OrderListItem {
  return {
    id: order.id,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    itemCount: order.items.length,
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.paymentStatus,
    date: order.createdAt,
  };
}

export interface ListOrdersParams {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
}

export interface ListOrdersResult {
  orders: OrderListItem[];
  total: number;
}

export async function listOrders({
  search,
  status,
  paymentStatus,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: ListOrdersParams): Promise<ListOrdersResult> {
  const conditions: Prisma.OrderWhereInput[] = [];

  if (status) conditions.push({ status });
  if (paymentStatus) conditions.push({ paymentStatus });
  if (dateFrom || dateTo) {
    conditions.push({
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }
  if (search) {
    conditions.push({
      customer: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      },
    });
  }

  const where: Prisma.OrderWhereInput = conditions.length ? { AND: conditions } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders: orders.map(toListItem), total };
}

export async function getOrdersForCustomer(customerId: string): Promise<OrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: ORDER_LIST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toListItem);
}

const ORDER_DETAIL_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  items: {
    select: {
      id: true,
      productId: true,
      productNameSnapshot: true,
      quantity: true,
      priceSnapshot: true,
      lineTotal: true,
    },
  },
} as const;

type OrderWithDetailRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAIL_INCLUDE }>;

export interface OrderDetailItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: string;
  customer: { id: string; name: string; email: string; phone: string | null };
  shippingAddress: string;
  postalCode: string;
  items: OrderDetailItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  adminNote: string | null;
  createdAt: Date;
}

function toDetail(order: OrderWithDetailRelations): OrderDetail {
  return {
    id: order.id,
    customer: {
      id: order.customer.id,
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    shippingAddress: order.shippingAddress,
    postalCode: order.postalCode,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      quantity: item.quantity,
      price: Number(item.priceSnapshot),
      lineTotal: Number(item.lineTotal),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingCost: Number(order.shippingCost),
    tax: Number(order.tax),
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.paymentStatus,
    adminNote: order.adminNote,
    createdAt: order.createdAt,
  };
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_DETAIL_INCLUDE });
  return order ? toDetail(order) : null;
}

/** Forward-only sequence PENDING -> SENDING -> SENT -> DELIVERED; CANCELLED only from PENDING/SENDING. */
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.SENDING, OrderStatus.CANCELLED],
  SENDING: [OrderStatus.SENT, OrderStatus.CANCELLED],
  SENT: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

export type UpdateOrderStatusResult =
  | { ok: true; order: OrderDetail }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "invalid_transition"; message: string };

export async function updateOrderStatus(
  id: string,
  nextStatus: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  const existing = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return { ok: false, reason: "not_found" };

  if (!VALID_STATUS_TRANSITIONS[existing.status].includes(nextStatus)) {
    return {
      ok: false,
      reason: "invalid_transition",
      message: `Cannot transition order from ${existing.status} to ${nextStatus}.`,
    };
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: nextStatus },
    include: ORDER_DETAIL_INCLUDE,
  });
  return { ok: true, order: toDetail(order) };
}

export type UpdateOrderNoteResult =
  | { ok: true; order: OrderDetail }
  | { ok: false; reason: "not_found" };

export async function updateOrderNote(id: string, adminNote: string): Promise<UpdateOrderNoteResult> {
  try {
    const order = await prisma.order.update({
      where: { id },
      data: { adminNote },
      include: ORDER_DETAIL_INCLUDE,
    });
    return { ok: true, order: toDetail(order) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
