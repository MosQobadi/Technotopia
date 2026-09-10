"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/i18n/navigation";
import { useCartLines } from "@/components/storefront/cart/useCartLines";
import { CheckoutSummary } from "@/components/storefront/checkout/CheckoutSummary";
import { PaymentMethodField } from "@/components/storefront/checkout/PaymentMethodField";
import { ShippingAddressFields } from "@/components/storefront/checkout/ShippingAddressFields";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { navTrail } from "@/components/storefront/navLinks";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useReceiptStore } from "@/lib/store/receipt";
import {
  checkoutFailure,
  receiptPath,
  toOrderPayload,
  type CheckoutFailure,
  type PlacedOrder,
} from "@/lib/storefront/checkout";
import { checkoutDetailsSchema, type CheckoutDetailsInput } from "@/lib/validation";

// Checkout, open to anyone holding a cart. An account is offered — it fills in
// the name and phone, and puts the order in an order history — and never asked
// for. The server decides who is ordering from the session, so this screen sends
// the same request either way and learns the answer from the response.
//
// What the screen shows while the customer decides comes from the cart and
// lib/storefront/checkout; what they are charged is recomputed by the server
// when the order is placed. The two agree because they share their arithmetic,
// and the summary prints no figure until the catalog has answered for it.

type OrderResponse = { success: true; data: PlacedOrder } | { success: false; error: string };

const EMPTY_DETAILS: CheckoutDetailsInput = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  paymentMethod: "CARD",
};

export function CheckoutContent() {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  const { cart, status, isEmpty, blocker, canCheckout, retry } = useCartLines();
  const clearCart = useCartStore((state) => state.clear);
  const setReceipt = useReceiptStore((state) => state.setReceipt);

  const [failure, setFailure] = useState<CheckoutFailure | null>(null);
  // Holds the screen between "the order exists" and the receipt rendering. The
  // cart is emptied as soon as it has been ordered, and without this the empty
  // state would flash on the way out.
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  // A signed-in customer's name and phone arrive a round trip after the form
  // does; anything already typed wins over them.
  const accountDetails = useMemo(
    () =>
      user
        ? {
            ...EMPTY_DETAILS,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            phone: user.phone ?? "",
          }
        : undefined,
    [user],
  );

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutDetailsInput>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: EMPTY_DETAILS,
    values: accountDetails,
    resetOptions: { keepDirtyValues: true },
  });

  async function onSubmit(details: CheckoutDetailsInput) {
    setFailure(null);

    const response = await fetch("/api/storefront/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toOrderPayload(details, cart)),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as OrderResponse | null | undefined;

    if (!response || !result?.success) {
      const reason = checkoutFailure(response?.status ?? 0);
      setFailure(reason);
      // Refused for what is in the cart: the catalog has moved since the page
      // read it, so read it again and let the summary say which line.
      if (reason === "cartChanged") await useCartStore.getState().reconcile();
      return;
    }

    const order = result.data;
    // In this order: the guard goes up before the cart empties, and a guest's
    // receipt is in place before the route that reads it.
    setPlaced(true);
    if (order.isGuest) setReceipt(order);
    clearCart();
    // `replace`: going back from a receipt should not land on a checkout form
    // for a cart that has already been ordered.
    router.replace(receiptPath(order));
  }

  if (status === "loading" || placed) {
    return (
      <CheckoutShell title={t("title")}>
        <p role="status" className="text-fg-subtle text-sm">
          {placed ? t("placed") : tCart("loading")}
        </p>
      </CheckoutShell>
    );
  }

  if (isEmpty) {
    return (
      <CheckoutShell title={t("title")}>
        <EmptyState
          message={t("empty")}
          actionLabel={tCommon("browseProducts")}
          actionHref="/products"
        />
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell title={t("title")}>
      {/* Only once it is known nobody is signed in — never flashed at a
          customer who is. */}
      {!authLoading && !user && <SignInOffer />}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid items-start gap-10 lg:grid-cols-[1fr_320px]"
      >
        <div className="flex flex-col gap-8">
          <ShippingAddressFields control={control} register={register} errors={errors} />
          <PaymentMethodField register={register} />
        </div>

        <CheckoutSummary
          cart={cart}
          status={status}
          blocker={blocker}
          canSubmit={canCheckout}
          submitting={isSubmitting}
          failure={failure}
          onRetry={retry}
        />
      </form>
    </CheckoutShell>
  );
}

// Signing in comes back here: the cart lives in the browser, so it is waiting
// on the other side of the login, and the account fills in the name and phone.
function SignInOffer() {
  const t = useTranslations("checkout");

  return (
    <p className="bg-surface-sunken text-fg-subtle mb-8 rounded-[20px] px-6 py-4 text-sm leading-relaxed">
      {t.rich("signInOffer", {
        login: (chunks) => (
          <Link
            href={{ pathname: "/login", query: { next: "/checkout" } }}
            className="text-accent-readable focus-visible:outline-accent-readable rounded font-semibold underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

function CheckoutShell({ title, children }: { title: string; children: ReactNode }) {
  const tNav = useTranslations("nav");

  return (
    <main className="mx-auto max-w-250 px-6 py-10 pb-24">
      <Breadcrumb items={navTrail("checkout", tNav)} className="mb-5" />
      <h1 className="text-fg text-title mb-8">{title}</h1>
      {children}
    </main>
  );
}
