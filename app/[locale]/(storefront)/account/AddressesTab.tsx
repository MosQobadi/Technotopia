"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import { Button } from "@/components/storefront/ui/Button";
import type { AddressCreateInput } from "@/lib/validation";
import type { Address } from "@/lib/generated/prisma/client";

// isDefault isn't in this form (no default-address UI in the wireframe) — sent as false.
const addressFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  phone: z.string().trim().min(1, "Phone number is required").max(30),
  addressLine: z.string().trim().min(1, "Street address is required").max(300),
  city: z.string().trim().min(1, "City is required").max(100),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

export function AddressesTab() {
  const t = useTranslations("account.addresses");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/storefront/account/addresses")
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.success) setAddresses(result.data);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? t("errorDefault"));
      return;
    }

    setAddresses((current) => [...(current ?? []), result.data]);
    reset();
    setIsAdding(false);
  }

  if (addresses === null) return null;

  return (
    <div className="flex flex-col gap-6">
      {addresses.length === 0 && !isAdding && <p className="text-sm text-gray-500">{t("empty")}</p>}

      {addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="bg-surface-100 rounded-[20px] p-5">
              <div className="text-ink-900 mb-1.5 text-sm font-bold">{address.fullName}</div>
              <address className="text-[13px] leading-relaxed text-gray-500 not-italic">
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
              className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {formError}
            </p>
          )}

          <TextField isRequired isInvalid={!!errors.fullName} fullWidth className="col-span-2">
            <Label className="sr-only">{t("fullName")}</Label>
            <Input placeholder={t("fullName")} {...register("fullName")} />
            <FieldError>{errors.fullName?.message}</FieldError>
          </TextField>

          <TextField isRequired isInvalid={!!errors.phone} fullWidth className="col-span-2">
            <Label className="sr-only">{t("phone")}</Label>
            <Input type="tel" placeholder={t("phone")} {...register("phone")} />
            <FieldError>{errors.phone?.message}</FieldError>
          </TextField>

          <TextField isRequired isInvalid={!!errors.addressLine} fullWidth className="col-span-2">
            <Label className="sr-only">{t("streetAddress")}</Label>
            <Input placeholder={t("streetAddress")} {...register("addressLine")} />
            <FieldError>{errors.addressLine?.message}</FieldError>
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
