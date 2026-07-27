import { prisma } from "@/lib/db";
import { OrderStatus, Status } from "@/lib/generated/prisma/enums";
import { listOrders, type OrderListItem } from "./order.service";

export interface DashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  activeProductCount: number;
  lowStockCount: number;
  recentOrders: OrderListItem[];
  recentOrdersTotal: number;
}

export interface GetDashboardSummaryParams {
  page: number;
  pageSize: number;
}

export async function getDashboardSummary({
  page,
  pageSize,
}: GetDashboardSummaryParams): Promise<DashboardSummary> {
  const [totalOrders, revenue, activeProductCount, lowStockCount, recent] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: OrderStatus.DELIVERED },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { status: Status.ACTIVE } }),
    // 1-9 = Low Stock — see Inventory model comment in schema.prisma.
    prisma.inventory.count({ where: { stock: { gt: 0, lt: 10 } } }),
    listOrders({ page, pageSize }),
  ]);

  return {
    totalOrders,
    totalRevenue: Number(revenue._sum.total ?? 0),
    activeProductCount,
    lowStockCount,
    recentOrders: recent.orders,
    recentOrdersTotal: recent.total,
  };
}
