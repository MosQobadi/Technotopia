"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/storefront/ui/Button";
import { requestFailure } from "@/lib/storefront/form-errors";
import { useFieldError } from "@/lib/storefront/useFieldError";
import { useAuthStore } from "@/lib/store/auth";
import type { ProfileUpdateInput } from "@/lib/validation";
import type { SafeUser } from "@/types/auth";

// The account API splits name into firstName/lastName (User.firstName/lastName), but the
// form collects one "Full name" field per the wireframe — split on submit, same as signup.
// No messages in the schema: a field's error is worded by useFieldError, in the reader's
// language.
const profileFormSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().min(1).email(),
  phone: z.string().trim().min(1),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileTabProps {
  /** Read on the server by app/[locale]/(storefront)/account/page.tsx. */
  user: SafeUser;
}

/** Mirrors the fullName -> firstName/lastName split registerCustomer() uses at signup. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: firstName ?? fullName, lastName: rest.join(" ") };
}

export function ProfileTab({ user }: ProfileTabProps) {
  const t = useTranslations("account.profile");
  const fieldError = useFieldError();
  const router = useRouter();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone ?? "",
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    setFormError(null);
    setSaved(false);

    const { firstName, lastName } = splitFullName(values.fullName);
    const payload: ProfileUpdateInput = {
      firstName,
      lastName,
      email: values.email,
      phone: values.phone,
    };

    const response = await fetch("/api/storefront/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);

    if (!result?.success) {
      // Named by status, never the route's English `error` (lib/storefront/form-errors).
      const reason = requestFailure(response?.status, ["unauthorized", "conflict"]);
      setFormError(t(`failure.${reason}`));
      return;
    }

    // Two readers of the same row, and neither can refresh the other: the page
    // re-renders on the server with the saved values, and the auth store the
    // navbar draws its initials from re-reads /api/auth/me.
    router.refresh();
    await hydrateAuth();
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-140 grid-cols-2 gap-4">
      {formError && (
        <p
          role="alert"
          className="bg-danger-soft text-danger col-span-2 rounded-md px-3 py-2 text-sm"
        >
          {formError}
        </p>
      )}
      {saved && !formError && (
        <p role="status" className="text-success col-span-2 text-sm">
          {t("saved")}
        </p>
      )}

      <Controller
        name="fullName"
        control={control}
        render={({ field }) => (
          <TextField isRequired isInvalid={!!errors.fullName} fullWidth className="col-span-2">
            <Label className="sr-only">{t("fullName")}</Label>
            <Input placeholder={t("fullName")} {...field} />
            <FieldError>{fieldError(errors.fullName)}</FieldError>
          </TextField>
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField isRequired isInvalid={!!errors.email} fullWidth>
            <Label className="sr-only">{t("email")}</Label>
            <Input type="email" placeholder={t("email")} {...field} />
            <FieldError>{fieldError(errors.email)}</FieldError>
          </TextField>
        )}
      />

      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <TextField isRequired isInvalid={!!errors.phone} fullWidth>
            <Label className="sr-only">{t("phone")}</Label>
            <Input type="tel" placeholder={t("phone")} {...field} />
            <FieldError>{fieldError(errors.phone)}</FieldError>
          </TextField>
        )}
      />

      <Button type="submit" variant="primary" disabled={isSubmitting} className="col-span-2 w-fit">
        {isSubmitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
