"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Tabs } from "@heroui/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/admin/form";

const generalFormSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(200),
  supportEmail: z
    .string()
    .max(200)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  supportPhone: z.string().max(50),
  socialLinks: z.string().max(500),
});

type GeneralFormValues = z.infer<typeof generalFormSchema>;

const GENERAL_DEFAULTS: GeneralFormValues = {
  storeName: "",
  supportEmail: "",
  supportPhone: "",
  socialLinks: "",
};

interface SettingsApiResponse {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}

function GeneralSettingsForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { control, handleSubmit, reset, formState } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: GENERAL_DEFAULTS,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/settings");
        const result: SettingsApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setLoadError(result.error ?? "Failed to load settings.");
          return;
        }
        reset({
          storeName: result.data.storeName ?? "",
          supportEmail: result.data.supportEmail ?? "",
          supportPhone: result.data.supportPhone ?? "",
          socialLinks: result.data.socialLinks ?? "",
        });
      } catch {
        if (!cancelled) setLoadError("Failed to load settings.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  async function onSubmit(values: GeneralFormValues) {
    setFormError(null);
    setSaved(false);

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result: SettingsApiResponse = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Failed to save settings.");
      return;
    }
    setSaved(true);
  }

  if (isLoading) return <p className="text-muted text-sm">Loading settings...</p>;
  if (loadError) return <p className="text-danger text-sm">{loadError}</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {formError && <p className="text-danger text-sm">{formError}</p>}
      {saved && !formState.isSubmitting && <p className="text-success text-sm">Settings saved.</p>}

      <TextField control={control} name="storeName" label="Store Name" isRequired />
      <TextField control={control} name="supportEmail" label="Support Email" type="email" />
      <TextField control={control} name="supportPhone" label="Support Phone" />
      <TextField control={control} name="socialLinks" label="Social Links" />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" isDisabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return <p className="text-muted text-sm">{label} settings are coming soon.</p>;
}

export function SettingsTabs() {
  return (
    <Card className="max-w-2xl">
      <Card.Header>
        <Card.Title>Settings</Card.Title>
      </Card.Header>
      <Card.Content>
        <Tabs variant="secondary">
          <Tabs.ListContainer>
            <Tabs.List>
              <Tabs.Tab id="general">General</Tabs.Tab>
              <Tabs.Tab id="shipping">Shipping</Tabs.Tab>
              <Tabs.Tab id="payment">Payment</Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="general">
            <GeneralSettingsForm />
          </Tabs.Panel>
          <Tabs.Panel id="shipping">
            <PlaceholderTab label="Shipping" />
          </Tabs.Panel>
          <Tabs.Panel id="payment">
            <PlaceholderTab label="Payment" />
          </Tabs.Panel>
        </Tabs>
      </Card.Content>
    </Card>
  );
}
