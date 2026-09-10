import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { OrderStatus, PaymentStatus, Status } from "@/lib/generated/prisma/enums";
import type { CreateOrderInput } from "@/lib/validation/order.schema";
import { SHIPPING_FLAT_RATE } from "@/lib/storefront/cart";

const ORDER_LIST_INCLUDE = {
  customer: { select: { firstName: true, lastName: true } },
  items: { select: { id: true } },
} as const;

type OrderWithListRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_LIST_INCLUDE }>;

export interface OrderListItem {
  id: string;
  customerName: string;
  /** No account behind it, so `customerName` is the name typed at checkout. */
  isGuest: boolean;
  itemCount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  date: Date;
}

function toListItem(order: OrderWithListRelations): OrderListItem {
  return {
    id: order.id,
    customerName: order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`
      : order.fullName,
    isGuest: order.customer === null,
    itemCount: order.items.length,
    total: order.total,
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
    const matches = { contains: search, mode: "insensitive" } as const;
    conditions.push({
      OR: [
        { customer: { OR: [{ firstName: matches }, { lastName: matches }, { email: matches }] } },
        // A guest has no account to search, so match what they typed at checkout.
        { customerId: null, OR: [{ fullName: matches }, { guestEmail: matches }] },
      ],
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

const ORDER_HISTORY_INCLUDE = {
  items: { select: { productNameSnapshot: true } },
} as const;

type OrderWithHistoryRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_HISTORY_INCLUDE }>;

export interface OrderHistoryItem {
  id: string;
  itemsSummary: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

function toHistoryItem(order: OrderWithHistoryRelations): OrderHistoryItem {
  const [first, ...rest] = order.items;
  const itemsSummary = first
    ? rest.length > 0
      ? `${first.productNameSnapshot} + ${rest.length} more`
      : first.productNameSnapshot
    : "";

  return {
    id: order.id,
    itemsSummary,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
  };
}

/** Order History tab on the My Account page — scoped to the requesting customer. */
export async function getOrderHistoryForCustomer(customerId: string): Promise<OrderHistoryItem[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: ORDER_HISTORY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toHistoryItem);
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
  /** `id` is null for a guest order, whose contact is what was typed at checkout. */
  customer: { id: string | null; name: string; email: string | null; phone: string | null };
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
  updatedAt: Date;
}

function toDetail(order: OrderWithDetailRelations): OrderDetail {
  return {
    id: order.id,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : { id: null, name: order.fullName, email: order.guestEmail, phone: order.phone },
    shippingAddress: order.shippingAddress,
    postalCode: order.postalCode,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      quantity: item.quantity,
      price: item.priceSnapshot,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shippingCost: order.shippingCost,
    tax: order.tax,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    adminNote: order.adminNote,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_DETAIL_INCLUDE });
  return order ? toDetail(order) : null;
}

/** Storefront lookup scoped to the requesting customer, so one customer can't view another's order by guessing an id. */
export async function getOrderForCustomer(
  id: string,
  customerId: string,
): Promise<OrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id, customerId },
    include: ORDER_DETAIL_INCLUDE,
  });
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
  { ok: true; order: OrderDetail } | { ok: false; reason: "not_found" };

export async function updateOrderNote(
  id: string,
  adminNote: string,
): Promise<UpdateOrderNoteResult> {
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

export interface StockShortfall {
  productId: string;
  name: string;
  available: number;
  requested: number;
}

export interface UnavailableItem {
  productId: string;
  /** The catalog's name for it, or null when the product is gone entirely. */
  name: string | null;
}

class InsufficientStockError extends Error {
  constructor(public readonly items: StockShortfall[]) {
    super("Insufficient stock");
  }
}

class UnavailableItemsError extends Error {
  constructor(public readonly items: UnavailableItem[]) {
    super("Unavailable items");
  }
}

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "empty_cart" }
  | { ok: false; reason: "unavailable_items"; items: UnavailableItem[] }
  | { ok: false; reason: "insufficient_stock"; items: StockShortfall[] };

/**
 * Checkout: verifies every line is still on sale, prices it from the catalog,
 * creates the Order + OrderItem snapshots and decrements Inventory — all
 * atomically so a mid-checkout failure can't leave stock decremented without an
 * order, or an order created without stock actually reserved.
 *
 * The lines arrive from the browser's cart, so nothing about them is trusted
 * beyond the id and the quantity: prices, names and availability are re-read
 * here. The cart itself is cleared by the browser once this returns.
 */
export async function createOrder(
  customerId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  try {
    const orderId = await prisma.$transaction(async (tx) => {
      if (input.items.length === 0) {
        throw new Error("EMPTY_CART");
      }

      const products = await tx.product.findMany({
        where: { id: { in: input.items.map((item) => item.productId) } },
        select: { id: true, name: true, price: true, discountPercent: true, status: true },
      });
      const byId = new Map(products.map((product) => [product.id, product]));

      const unavailable: UnavailableItem[] = [];
      const lineItems = [];
      for (const item of input.items) {
        const product = byId.get(item.productId);
        if (!product || product.status !== Status.ACTIVE) {
          unavailable.push({ productId: item.productId, name: product?.name ?? null });
          continue;
        }
        const discountedPrice = product.price * (1 - product.discountPercent / 100);
        lineItems.push({
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          lineTotal: Math.round(discountedPrice * item.quantity),
        });
      }

      if (unavailable.length > 0) {
        throw new UnavailableItemsError(unavailable);
      }

      const shortfalls: StockShortfall[] = [];
      for (const item of lineItems) {
        const decremented = await tx.inventory.updateMany({
          where: { productId: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity }, lastUpdatedAt: new Date() },
        });
        if (decremented.count === 0) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
            select: { stock: true },
          });
          shortfalls.push({
            productId: item.productId,
            name: item.name,
            available: inventory?.stock ?? 0,
            requested: item.quantity,
          });
        }
      }

      if (shortfalls.length > 0) {
        throw new InsufficientStockError(shortfalls);
      }

      const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discountedSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const discount = subtotal - discountedSubtotal;
      const shippingCost = SHIPPING_FLAT_RATE;
      const tax = 0;
      const total = discountedSubtotal + shippingCost + tax;

      const order = await tx.order.create({
        data: {
          customerId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod: input.paymentMethod,
          subtotal,
          discount,
          shippingCost,
          tax,
          total,
          fullName: input.fullName,
          phone: input.phone,
          shippingAddress: input.address,
          city: input.city,
          postalCode: input.postalCode,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              productNameSnapshot: item.name,
              priceSnapshot: item.price,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
        },
        select: { id: true },
      });

      return order.id;
    });

    return { ok: true, orderId };
  } catch (err) {
    if (err instanceof UnavailableItemsError) {
      return { ok: false, reason: "unavailable_items", items: err.items };
    }
    if (err instanceof InsufficientStockError) {
      return { ok: false, reason: "insufficient_stock", items: err.items };
    }
    if (err instanceof Error && err.message === "EMPTY_CART") {
      return { ok: false, reason: "empty_cart" };
    }
    throw err;
  }
}
