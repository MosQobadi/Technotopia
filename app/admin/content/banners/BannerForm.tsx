"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  FormActions,
  ImageUploadField,
  TextareaField,
  TextField,
  ToggleField,
} from "@/components/admin/form";

const bannerFormSchema = z.object({
  image: z
    .union([z.instanceof(File), z.string(), z.null()])
    .refine((v) => v !== null && v !== "", "Image is required"),
  headline: z.string().min(1, "Headline is required").max(200),
  subheadline: z.string().max(300),
  link: z
    .string()
    .max(500)
    .refine(
      (v) => v === "" || /^(https?:\/\/|\/)/.test(v),
      "Link must be a valid URL",
    ),
  displayOrder: z
    .string()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0, {
      message: "Display order must be a positive number",
    }),
  isActive: z.boolean(),
});

type BannerFormValues = z.infer<typeof bannerFormSchema>;

export interface BannerFormBanner {
  id: string;
  image: string;
  headline: string;
  subheadline: string | null;
  link: string | null;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
}

interface BannerFormProps {
  banner?: BannerFormBanner;
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to upload image.");
  }
  return result.data.url as string;
}

export function BannerForm({ banner }: BannerFormProps) {
  const router = useRouter();
  const isEditMode = !!banner;
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      image: banner?.image ?? null,
      headline: banner?.headline ?? "",
      subheadline: banner?.subheadline ?? "",
      link: banner?.link ?? "",
      displayOrder: banner ? String(banner.displayOrder) : "0",
      isActive: banner ? banner.status === "ACTIVE" : true,
    },
  });

  async function onSubmit(values: BannerFormValues) {
    setFormError(null);

    let image: string;
    try {
      image = values.image instanceof File ? await uploadImage(values.image) : (values.image ?? "");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to upload image.");
      return;
    }

    const payload = {
      image,
      headline: values.headline,
      subheadline: values.subheadline === "" ? null : values.subheadline,
      link: values.link === "" ? null : values.link,
      displayOrder: Number(values.displayOrder),
      status: values.isActive ? "ACTIVE" : "INACTIVE",
    };

    const response = await fetch(
      isEditMode ? `/api/admin/banners/${banner.id}` : "/api/admin/banners",
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Failed to save banner.");
      return;
    }

    router.push("/admin/content/banners");
  }

  return (
    <Card className="max-w-4xl">
      <Card.Header>
        <Card.Title>{isEditMode ? "Edit Banner" : "Add Banner"}</Card.Title>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {formError && <p className="text-danger text-sm">{formError}</p>}

          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <TextField
                control={control}
                name="headline"
                label="Headline"
                placeholder="e.g. Summer Sale"
                isRequired
              />
              <TextareaField
                control={control}
                name="subheadline"
                label="Subheadline"
                placeholder="Optional supporting text"
                rows={3}
              />
              <TextField
                control={control}
                name="link"
                label="Link"
                placeholder="e.g. /products or https://..."
              />
              <TextField
                control={control}
                name="displayOrder"
                label="Display Order"
                type="number"
                isRequired
              />
              <ToggleField control={control} name="isActive" label="Active" />
            </div>

            <div className="flex flex-col gap-5">
              <ImageUploadField
                control={control}
                name="image"
                label="Banner Image"
                description="Click or drag to upload"
                isRequired
              />
            </div>
          </div>

          <FormActions
            isSubmitting={formState.isSubmitting}
            onCancel={() => router.push("/admin/content/banners")}
            saveLabel="Save Banner"
          />
        </form>
      </Card.Content>
    </Card>
  );
}
