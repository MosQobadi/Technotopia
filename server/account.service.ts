import { prisma } from "@/lib/db";
import type { Address, User } from "@/lib/generated/prisma/client";
import type { AddressCreateInput, AddressUpdateInput, ProfileUpdateInput } from "@/lib/validation";
import type { SafeUser } from "@/types/auth";

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getProfile(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toSafeUser(user) : null;
}

export type UpdateProfileResult =
  | { ok: true; user: SafeUser }
  | { ok: false; reason: "email_taken" | "phone_taken" };

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<UpdateProfileResult> {
  const existing = await prisma.user.findFirst({
    where: { id: { not: userId }, OR: [{ email: input.email }, { phone: input.phone }] },
    select: { email: true, phone: true },
  });
  if (existing) {
    return { ok: false, reason: existing.email === input.email ? "email_taken" : "phone_taken" };
  }

  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return { ok: true, user: toSafeUser(user) };
}

export async function getAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(userId: string, input: AddressCreateInput): Promise<Address> {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...input, userId } });
  });
}

export type AddressMutationResult = { ok: true; address: Address } | { ok: false; reason: "not_found" };

async function findOwnedAddress(userId: string, addressId: string) {
  return prisma.address.findFirst({ where: { id: addressId, userId } });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressUpdateInput,
): Promise<AddressMutationResult> {
  const existing = await findOwnedAddress(userId, addressId);
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  const address = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }
    return tx.address.update({ where: { id: addressId }, data: input });
  });

  return { ok: true, address };
}

export type DeleteAddressResult = { ok: true } | { ok: false; reason: "not_found" };

export async function deleteAddress(userId: string, addressId: string): Promise<DeleteAddressResult> {
  const existing = await findOwnedAddress(userId, addressId);
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  await prisma.address.delete({ where: { id: addressId } });
  return { ok: true };
}
