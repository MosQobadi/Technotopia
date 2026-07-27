import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { getOrdersForCustomer, type OrderListItem } from "./order.service";

const CUSTOMER_LIST_INCLUDE = {
  _count: { select: { orders: true } },
} as const;

type CustomerWithListRelations = Prisma.UserGetPayload<{ include: typeof CUSTOMER_LIST_INCLUDE }>;

export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: Status;
  orderCount: number;
  createdAt: Date;
}

function toListItem(user: CustomerWithListRelations): CustomerListItem {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    status: user.status,
    orderCount: user._count.orders,
    createdAt: user.createdAt,
  };
}

export interface ListCustomersParams {
  search?: string;
  status?: Status;
  page: number;
  pageSize: number;
}

export interface ListCustomersResult {
  customers: CustomerListItem[];
  total: number;
}

export async function listCustomers({
  search,
  status,
  page,
  pageSize,
}: ListCustomersParams): Promise<ListCustomersResult> {
  const conditions: Prisma.UserWhereInput[] = [{ role: Role.CUSTOMER }];

  if (status) conditions.push({ status });
  if (search) {
    conditions.push({
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.UserWhereInput = { AND: conditions };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: CUSTOMER_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { customers: customers.map(toListItem), total };
}

export interface CustomerDetail extends CustomerListItem {
  orders: OrderListItem[];
}

export async function getCustomerById(id: string): Promise<CustomerDetail | null> {
  const user = await prisma.user.findFirst({
    where: { id, role: Role.CUSTOMER },
    include: CUSTOMER_LIST_INCLUDE,
  });
  if (!user) return null;

  const orders = await getOrdersForCustomer(id);
  return { ...toListItem(user), orders };
}

export type UpdateCustomerStatusResult =
  | { ok: true; customer: CustomerListItem }
  | { ok: false; reason: "not_found" };

export async function updateCustomerStatus(
  id: string,
  status: Status,
): Promise<UpdateCustomerStatusResult> {
  const existing = await prisma.user.findFirst({
    where: { id, role: Role.CUSTOMER },
    select: { id: true },
  });
  if (!existing) return { ok: false, reason: "not_found" };

  const user = await prisma.user.update({
    where: { id },
    data: { status },
    include: CUSTOMER_LIST_INCLUDE,
  });
  return { ok: true, customer: toListItem(user) };
}
