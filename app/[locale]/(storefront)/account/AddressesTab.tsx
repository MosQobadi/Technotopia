"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import { Button } from "@/components/storefront/ui/Button";
import { requestFailure } from "@/lib/storefront/form-errors";
import { useFieldError } from "@/lib/storefront/useFieldError";
import type { AddressCreateInput } from "@/lib/validation";
import type { Address } from "@/lib/generated/prisma/client";

// isDefault isn't in this form (no default-address UI in the wireframe) — sent as false.
// No messages in the schema: a field's error is worded by useFieldError, in the reader's
// language.
const addressFormSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(30),
  addressLine: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

interface AddressesTabProps {
  /** Read on the server by app/[locale]/(storefront)/account/page.tsx. */
  initialAddresses: Address[];
}

export function AddressesTab({ initialAddresses }: AddressesTabProps) {
  const t = useTranslations("account.addresses");
  const fieldError = useFieldError();
  // The list arrives with the page; this state exists only so a newly added
  // address appears without a round-trip back to the server render.
  const [addresses, setAddresses] = useState(initialAddresses);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { fullName: "", phone: "", addressLine: "", city: "", postalCode: "" },
  });

  async function onSubmit(values: AddressFormValues) {
    setFormError(null);

    const payload: AddressCreateInput = { ...values, isDefault: false };
    const response = await fetch("/api/storefront/account/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);

    if (!result?.success) {
      // Named by status, never the route's English `error` (lib/storefront/form-errors).
      setFormError(t(`failure.${requestFailure(response?.status, ["unauthorized"])}`));
      return;
    }

    setAddresses((current) => [...current, result.data]);
    reset();
    setIsAdding(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {addresses.length === 0 && !isAdding && <p className="text-sm text-fg-subtle">{t("empty")}</p>}

      {addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="bg-surface-sunken rounded-[20px] p-5">
              <div className="text-fg mb-1.5 text-sm font-bold">{address.fullName}</div>
              <address className="text-[13px] leading-relaxed text-fg-subtle not-italic">
                {address.addressLine}, {address.city}, {address.postalCode}
                <br />
                {address.phone}
              </address>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-140 grid-cols-2 gap-4">
          {formError && (
            <p
              role="alert"
              className="bg-danger-soft text-danger col-span-2 rounded-md px-3 py-2 text-sm"
            >
              {formError}
            </p>
          )}

          <TextField isRequired isInvalid={!!errors.fullName} fullWidth className="col-span-2">
            <Label className="sr-only">{t("fullName")}</Label>
            <Input placeholder={t("fullName")} {...register("fullName")} />
            <FieldError>{fieldError(errors.fullName)}</FieldError>
          </TextField>

          <TextField isRequired isInvalid={!!errors.phone} fullWidth className="col-span-2">
            <Label className="sr-only">{t("phone")}</Label>
            <Input type="tel" placeholder={t("phone")} {...register("phone")} />
            <FieldError>{fieldError(errors.phone)}</FieldError>
          </TextField>

          <TextField isRequired isInvalid={!!errors.addressLine} fullWidth className="col-span-2">
            <Label className="sr-only">{t("streetAddress")}</Label>
            <Input placeholder={t("streetAddress")} {...register("addressLine")} />
            <FieldError>{fieldError(errors.addressLine)}</FieldError>
          </TextField>

          <TextField isRequired isInvalid={!!errors.city} fullWidth>
            <Label className="sr-only">{t("city")}</Label>
            <Input placeholder={t("city")} {...register("city")} />
            <FieldError>{fieldError(errors.city)}</FieldError>
          </TextField>

          <TextField isRequired isInvalid={!!errors.postalCode} fullWidth>
            <Label className="sr-only">{t("postalCode")}</Label>
            <Input placeholder={t("postalCode")} {...register("postalCode")} />
            <FieldError>{fieldError(errors.postalCode)}</FieldError>
          </TextField>

          <div className="col-span-2 flex gap-3">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : t("save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset();
                setFormError(null);
                setIsAdding(false);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="w-fit" onClick={() => setIsAdding(true)}>
          {t("add")}
        </Button>
      )}
    </div>
  );
}
