import { NextResponse, type NextRequest } from "next/server";
import { parseCartIds } from "@/lib/storefront/cart";
import { cartLookupQuerySchema } from "@/lib/validation";
import { getCartCatalogEntries } from "@/server/cart.service";

/**
 * Reconciles a browser cart against the catalog. Public on purpose: the cart
 * lives in the visitor's browser, so this has to answer for someone who has
 * never signed in. It creates nothing and takes no body — the ids are not
 * personal data, and reading them is a read.
 *
 * What comes back is the catalog's current truth for those ids. Turning that
 * into lines with issues is `reconcileCart` in `lib/storefront/cart.ts`, which
 * the store and the cart page call with the quantities and captured prices the
 * server never sees.
 */
export async function GET(request: NextRequest) {
  const parsed = cartLookupQuerySchema.safeParse({
    ids: request.nextUrl.searchParams.get("ids") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const entries = await getCartCatalogEntries(parseCartIds(parsed.data.ids));
  return NextResponse.json({ success: true, data: { entries } });
}
