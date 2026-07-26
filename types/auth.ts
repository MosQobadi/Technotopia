import type { User } from "@/lib/generated/prisma/client";

/** The current user shape returned by auth endpoints — never includes passwordHash. */
export type SafeUser = Omit<User, "passwordHash">;
