"use client";

import { useTranslations } from "next-intl";
import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import type { CheckoutDetailsInput } from "@/lib/validation";

interface ShippingAddressFieldsProps {
  control: Control<CheckoutDetailsInput>;
  register: UseFormRegister<CheckoutDetailsInput>;
  errors: FieldErrors<CheckoutDetailsInput>;
}

export function ShippingAddressFields({ control, register, errors }: ShippingAddressFieldsProps) {
  const t = useTranslations("checkout");

  return (
    <section>
      <h2 className="text-fg text-subhead mb-4">{t("shippingAddress")}</h2>
      <div className="grid grid-cols-2 gap-3.5">
        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <TextField isRequired isInvalid={!!errors.fullName} fullWidth className="col-span-2">
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
            <TextField isRequired isInvalid={!!errors.phone} fullWidth className="col-span-2">
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
  );
}
