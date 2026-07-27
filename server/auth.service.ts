import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
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
