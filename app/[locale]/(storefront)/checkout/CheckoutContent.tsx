"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/storefront/ui/Button";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { formatPrice } from "@/lib/format";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validation";
import { cn } from "@/lib/cn";

export function CheckoutContent() {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const PAYMENT_METHODS = [
    { key: "CARD", label: t("paymentMethodCard") },
    { key: "BANK_TRANSFER", label: t("paymentMethodBankTransfer") },
  ] as const;

  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const shipping = useCartStore((state) => state.shipping);
  const total = useCartStore((state) => state.total);
  const cartLoading = useCartStore((state) => state.isLoading);
  const hydrateCart = useCartStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateCart();
  }, [user, hydrateCart]);

  const [paymentMethod, setPaymentMethod] = useState<CreateOrderInput["paymentMethod"]>("CARD");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      paymentMethod: "CARD",
    },
    values: user
      ? {
          fullName: `${user.firstName} ${user.lastName}`.trim(),
          phone: user.phone ?? "",
          address: "",
          city: "",
          postalCode: "",
          paymentMethod,
        }
      : undefined,
    resetOptions: { keepDirtyValues: true },
  });

  const showLoggedOut = !authLoading && !user;
  const showEmpty = !authLoading && !!user && !cartLoading && items.length === 0;
  const showCheckout = !authLoading && !!user && !cartLoading && items.length > 0;

  async function onSubmit(values: CreateOrderInput) {
    setFormError(null);

    const response = await fetch("/api/storefront/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? t("errorDefault"));
      return;
    }

    router.push(`/orders/${result.data.orderId}/confirmation`);
  }

  return (
    <main className="mx-auto max-w-250 px-6 py-10 pb-24">
      <h1 className="text-ink-900 text-title mb-8">{t("title")}</h1>

      {showLoggedOut && (
        <EmptyState message={t("loggedOut")} actionLabel={tCommon("logIn")} actionHref="/login" />
      )}

      {showEmpty && (
        <EmptyState
          message={t("empty")}
          actionLabel={tCommon("browseProducts")}
          actionHref="/products"
        />
      )}

      {showCheckout && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid items-start gap-10 lg:grid-cols-[1fr_320px]"
        >
          <div className="flex flex-col gap-8">
            {formError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            )}

            <section>
              <h2 className="text-ink-900 text-subhead mb-4">{t("shippingAddress")}</h2>
              <div className="grid grid-cols-2 gap-3.5">
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      isRequired
                      isInvalid={!!errors.fullName}
                      fullWidth
                      className="col-span-2"
                    >
                      <Label className="sr-only">{t("fullName")}</Label>
                      <Input placeholder={t("fullNamePlaceholder")} {...field} />
                      <FieldError>{errors.fullName?.message}</FieldError>
                    </TextField>
                  )}
                />

                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      isRequired
                      isInvalid={!!errors.phone}
                      fullWidth
                      className="col-span-2"
                    >
                      <Label className="sr-only">{t("phone")}</Label>
                      <Input type="tel" placeholder={t("phonePlaceholder")} {...field} />
                      <FieldError>{errors.phone?.message}</FieldError>
                    </TextField>
                  )}
                />

                <TextField isRequired isInvalid={!!errors.address} fullWidth className="col-span-2">
                  <Label className="sr-only">{t("streetAddress")}</Label>
                  <Input placeholder={t("streetAddressPlaceholder")} {...register("address")} />
                  <FieldError>{errors.address?.message}</FieldError>
                </TextField>

                <TextField isRequired isInvalid={!!errors.city} fullWidth>
                  <Label className="sr-only">{t("city")}</Label>
                  <Input placeholder={t("city")} {...register("city")} />
                  <FieldError>{errors.city?.message}</FieldError>
                </TextField>

                <TextField isRequired isInvalid={!!errors.postalCode} fullWidth>
                  <Label className="sr-only">{t("postalCode")}</Label>
                  <Input placeholder={t("postalCode")} {...register("postalCode")} />
                  <FieldError>{errors.postalCode?.message}</FieldError>
                </TextField>
              </div>
            </section>

            <section>
              <h2 className="text-ink-900 text-subhead mb-4">{t("paymentMethod")}</h2>
              <div className="flex flex-col gap-2.5">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.key}
                    className={cn(
                      "has-focus-visible:outline-accent flex cursor-pointer items-center gap-3 rounded-2xl p-4 outline-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2",
                      paymentMethod === method.key ? "bg-accent/8" : "bg-surface-100",
                    )}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.key}
                      checked={paymentMethod === method.key}
                      onChange={() => setPaymentMethod(method.key)}
                      className="sr-only"
                    />
                    <span className="text-ink-900 text-sm font-semibold">{method.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="bg-surface-100 sticky top-6 rounded-[20px] p-6">
            <h2 className="text-ink-900 text-subhead mb-5">{tCommon("orderSummary")}</h2>
            <div className="mb-2.5 flex flex-col gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-[13px] text-gray-500">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex justify-between border-t border-gray-200 pt-4 text-sm text-gray-500">
              <span>{tCommon("subtotal")}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mb-4 flex justify-between text-sm text-gray-500">
              <span>{tCommon("shipping")}</span>
              <span>{shipping > 0 ? formatPrice(shipping) : tCommon("free")}</span>
            </div>
            <div className="text-ink-900 mb-6 flex justify-between border-t border-gray-200 pt-4 text-lg font-extrabold">
              <span>{tCommon("total")}</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
              {isSubmitting ? t("placingOrder") : t("placeOrder")}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}
