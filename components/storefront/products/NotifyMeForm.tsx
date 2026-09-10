"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import { Button } from "@/components/storefront/ui/Button";
import {
  stockNotificationCreateSchema,
  type StockNotificationCreateInput,
} from "@/lib/validation";

// The out-of-stock half of the PDP's buy box: one field, an email or a phone
// number, recorded against the product for the admin's Inventory stock modal,
// where whoever restocks it can see who is waiting. It owns its POST — there is
// one endpoint and one shape, and nothing a caller would want to change.

type Outcome = "waiting" | "alreadyInStock";

interface NotifyMeFormProps {
  slug: string;
}

export function NotifyMeForm({ slug }: NotifyMeFormProps) {
  const t = useTranslations("productDetail.notify");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockNotificationCreateInput>({
    resolver: zodResolver(stockNotificationCreateSchema),
    defaultValues: { contact: "" },
  });

  async function onSubmit(values: StockNotificationCreateInput) {
    setFormError(null);

    const response = await fetch(`/api/storefront/products/${encodeURIComponent(slug)}/notify-me`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);

    if (!result?.success) {
      // The server's message is English and also serves the API; the screen
      // states the reason in the reader's language instead of echoing it.
      setFormError(response?.status === 429 ? t("rateLimited") : t("failed"));
      return;
    }

    setOutcome(result.data.alreadyInStock ? "alreadyInStock" : "waiting");
  }

  if (outcome) {
    return (
      <p role="status" className="text-fg-muted text-sm">
        {t(outcome)}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <TextField isInvalid={!!errors.contact} fullWidth className="flex-1">
        <Label className="sr-only">{t("label")}</Label>
        <Input
          type="text"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder={t("placeholder")}
          {...register("contact")}
        />
        {/* The schema's message is English-only for the same reason as above. */}
        <FieldError>{errors.contact ? t("invalid") : undefined}</FieldError>
      </TextField>

      <Button type="submit" disabled={isSubmitting} className="shrink-0">
        {isSubmitting ? t("sending") : t("submit")}
      </Button>

      {formError && (
        <p role="alert" className="text-danger text-sm sm:basis-full">
          {formError}
        </p>
      )}
    </form>
  );
}
