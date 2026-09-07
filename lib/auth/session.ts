import { cookies } from "next/headers";
import { getCookieName } from "./cookies";
import { verifyToken, type AuthTokenPayload } from "./jwt";

/**
 * The session as a Server Component sees it — the same JWT `requireUser()` reads
 * in a route handler, taken from `next/headers` instead of a `NextRequest`.
 *
 * Deliberately not re-exported from `lib/auth/index.ts`: `proxy.ts` imports that
 * barrel and runs on the edge, where `next/headers` does not exist. Import this
 * module directly.
 */
export async function getSessionPayload(): Promise<AuthTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;
  return token ? verifyToken(token) : null;
}
