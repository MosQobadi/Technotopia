import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import type { User } from "@/lib/generated/prisma/client";
import type { SafeUser } from "@/types/auth";

export type AuthenticateAdminResult =
  | { ok: true; user: SafeUser }
  | { ok: false; reason: "invalid_credentials" | "not_admin" };

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

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<AuthenticateAdminResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return { ok: false, reason: "invalid_credentials" };
  }

  if (user.role !== Role.ADMIN) {
    return { ok: false, reason: "not_admin" };
  }

  return { ok: true, user: toSafeUser(user) };
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toSafeUser(user) : null;
}

export type AuthenticateUserResult =
  | { ok: true; user: SafeUser }
  | { ok: false; reason: "invalid_credentials" };

/**
 * Storefront login — accepts either email or phone as the identifier and does not
 * restrict by role. Kept separate from authenticateAdmin, which enforces ADMIN.
 */
export async function authenticateUser(
  identifier: string,
  password: string,
): Promise<AuthenticateUserResult> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return { ok: false, reason: "invalid_credentials" };
  }

  return { ok: true, user: toSafeUser(user) };
}

export type RegisterCustomerResult =
  | { ok: true; user: SafeUser }
  | { ok: false; reason: "email_taken" | "phone_taken" };

export async function registerCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<RegisterCustomerResult> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing) {
    return { ok: false, reason: existing.email === input.email ? "email_taken" : "phone_taken" };
  }

  const [firstName, ...rest] = input.fullName.split(/\s+/);
  const lastName = rest.join(" ");
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: firstName ?? input.fullName,
      lastName,
      role: Role.CUSTOMER,
    },
  });

  return { ok: true, user: toSafeUser(user) };
}
