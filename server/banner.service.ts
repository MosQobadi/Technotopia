import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { Banner } from "@/lib/generated/prisma/client";
import type { Status } from "@/lib/generated/prisma/enums";
import type {
  BannerCreateInput,
  BannerReorderInput,
  BannerUpdateInput,
} from "@/lib/validation";

export interface ListBannersParams {
  status?: Status;
  page: number;
  pageSize: number;
}

export interface ListBannersResult {
  banners: Banner[];
  total: number;
}

export async function listBanners({
  status,
  page,
  pageSize,
}: ListBannersParams): Promise<ListBannersResult> {
  const where: Prisma.BannerWhereInput = status ? { status } : {};

  const [banners, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.banner.count({ where }),
  ]);

  return { banners, total };
}

export async function createBanner(input: BannerCreateInput): Promise<Banner> {
  return prisma.banner.create({ data: input });
}

export async function getBannerById(id: string): Promise<Banner | null> {
  return prisma.banner.findUnique({ where: { id } });
}

export type UpdateBannerResult = { ok: true; banner: Banner } | { ok: false; reason: "not_found" };

export async function updateBanner(
  id: string,
  input: BannerUpdateInput,
): Promise<UpdateBannerResult> {
  try {
    const banner = await prisma.banner.update({ where: { id }, data: input });
    return { ok: true, banner };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}

export type DeleteBannerResult = { ok: true } | { ok: false; reason: "not_found" };

export async function deleteBanner(id: string): Promise<DeleteBannerResult> {
  try {
    await prisma.banner.delete({ where: { id } });
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}

export type ReorderBannersResult = { ok: true } | { ok: false; reason: "not_found" };

export async function reorderBanners(input: BannerReorderInput): Promise<ReorderBannersResult> {
  try {
    await prisma.$transaction(
      input.map(({ id, displayOrder }) =>
        prisma.banner.update({ where: { id }, data: { displayOrder } }),
      ),
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { ok: false, reason: "not_found" };
    }
    throw err;
  }
}
