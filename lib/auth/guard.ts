import type { NextRequest } from "next/server";
import { Role } from "@/lib/generated/prisma/enums";
import { getCookieName } from "./cookies";
import { verifyToken, type AuthTokenPayload } from "./jwt";

export type RequireAdminResult =
  | { ok: true; payload: AuthTokenPayload }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Route-handler-level auth check. `proxy.ts` blocks unauthenticated/non-admin
 * requests at the routing layer, but every admin route handler re-verifies
 * the JWT + role itself — defense in depth, not duplicated trust.
 */
export async function requireAdmin(request: NextRequest): Promise<RequireAdminResult> {
  const token = request.cookies.get(getCookieName())?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return { ok: false, status: 401, error: "Not authenticated." };
  }
  if (payload.role !== Role.ADMIN) {
    return { ok: false, status: 403, error: "Admin access required." };
  }
  return { ok: true, payload };
}
