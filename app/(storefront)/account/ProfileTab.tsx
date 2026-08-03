"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FieldError, Input, Label, TextField } from "@heroui/react";
import { Button } from "@/components/storefront/ui/Button";
import type { ProfileUpdateInput } from "@/lib/validation";
import type { SafeUser } from "@/types/auth";

// The account API splits name into firstName/lastName (User.firstName/lastName), but the
// form collects one "Full name" field per the wireframe — split on submit, same as signup.
const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().trim().min(1, "Phone number is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileTabProps {
  user: SafeUser;
  onSaved: () => Promise<void>;
}

/** Mirrors the fullName -> firstName/lastName split registerCustomer() uses at signup. */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: firstName ?? fullName, lastName: rest.join(" ") };
}

export function ProfileTab({ user, onSaved }: ProfileTabProps) {
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
    const payload: ProfileUpdateInput = { firstName, lastName, email: values.email, phone: values.phone };

    const response = await fetch("/api/storefront/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Could not save your changes.");
      return;
    }

    await onSaved();
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-140 grid-cols-2 gap-4">
      {formError && (
        <p role="alert" className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {formError}
        </p>
      )}
      {saved && !formError && (
        <p role="status" className="text-success col-span-2 text-sm">
          Changes saved.
        </p>
      )}

      <Controller
        name="fullName"
        control={control}
        render={({ field }) => (
          <TextField isRequired isInvalid={!!errors.fullName} fullWidth className="col-span-2">
            <Label className="sr-only">Full name</Label>
            <Input placeholder="Full name" {...field} />
            <FieldError>{errors.fullName?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <TextField isRequired isInvalid={!!errors.email} fullWidth>
            <Label className="sr-only">Email</Label>
            <Input type="email" placeholder="Email" {...field} />
            <FieldError>{errors.email?.message}</FieldError>
          </TextField>
        )}
      />

      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <TextField isRequired isInvalid={!!errors.phone} fullWidth>
            <Label className="sr-only">Phone</Label>
            <Input type="tel" placeholder="Phone" {...field} />
            <FieldError>{errors.phone?.message}</FieldError>
          </TextField>
        )}
      />

      <Button type="submit" variant="primary" disabled={isSubmitting} className="col-span-2 w-fit">
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
