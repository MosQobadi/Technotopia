"use client";

import { useTranslations } from "next-intl";
import type { UseFormRegister } from "react-hook-form";
import type { CheckoutDetailsInput } from "@/lib/validation";

// The payment methods the order schema accepts, as one radio group. The radios
// are registered with the form, so the method submitted is the one on screen,
// and the chosen card is painted from the input's own :checked state rather than
// from a copy of it held in React — a copy is how the two came apart before.
export function PaymentMethodField({
  register,
}: {
  register: UseFormRegister<CheckoutDetailsInput>;
}) {
  const t = useTranslations("checkout");

  const methods: { value: CheckoutDetailsInput["paymentMethod"]; label: string }[] = [
    { value: "CARD", label: t("paymentMethodCard") },
    { value: "BANK_TRANSFER", label: t("paymentMethodBankTransfer") },
  ];

  return (
    <fieldset>
      <legend className="text-fg text-subhead mb-4">{t("paymentMethod")}</legend>
      <div className="flex flex-col gap-2.5">
        {methods.map((method) => (
          <label
            key={method.value}
            className="has-focus-visible:outline-accent-readable bg-surface-sunken has-checked:bg-accent/8 flex cursor-pointer items-center gap-3 rounded-2xl p-4 outline-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
          >
            <input
              type="radio"
              value={method.value}
              className="sr-only"
              {...register("paymentMethod")}
            />
            <span className="text-fg text-sm font-semibold">{method.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
