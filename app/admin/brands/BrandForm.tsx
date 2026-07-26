"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormActions, ImageUploadField, TextField, ToggleField } from "@/components/admin/form";
import { slugify } from "@/lib/slugify";

const brandFormSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  logo: z.union([z.instanceof(File), z.string(), z.null()]),
  isActive: z.boolean(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

export interface BrandFormBrand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: "ACTIVE" | "INACTIVE";
}

interface BrandFormProps {
  brand?: BrandFormBrand;
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

export function BrandForm({ brand }: BrandFormProps) {
  const router = useRouter();
  const isEditMode = !!brand;
  const [formError, setFormError] = useState<string | null>(null);
  const lastAutoSlug = useRef(brand?.slug ?? "");

  const { control, handleSubmit, formState, setValue, setError, getValues } =
    useForm<BrandFormValues>({
      resolver: zodResolver(brandFormSchema),
      defaultValues: {
        name: brand?.name ?? "",
        slug: brand?.slug ?? "",
        logo: brand?.logo ?? null,
        isActive: brand ? brand.status === "ACTIVE" : true,
      },
    });

  const name = useWatch({ control, name: "name" });

  // Only auto-fill the slug in create mode, and only while the user hasn't
  // diverged from the last value we generated — editing the slug directly
  // opts it out of further auto-fill for the rest of the session.
  useEffect(() => {
    if (isEditMode) return;
    if (getValues("slug") !== lastAutoSlug.current) return;
    const nextSlug = slugify(name);
    lastAutoSlug.current = nextSlug;
    setValue("slug", nextSlug, { shouldValidate: false });
  }, [name, isEditMode, getValues, setValue]);

  async function onSubmit(values: BrandFormValues) {
    setFormError(null);

    let logo: string | null;
    try {
      logo = values.logo instanceof File ? await uploadImage(values.logo) : values.logo;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to upload image.");
      return;
    }

    const payload = {
      name: values.name,
      slug: values.slug,
      logo,
      status: values.isActive ? "ACTIVE" : "INACTIVE",
    };

    const response = await fetch(
      isEditMode ? `/api/admin/brands/${brand.id}` : "/api/admin/brands",
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();

    if (!result.success) {
      if (/slug/i.test(result.error ?? "")) {
        setError("slug", { message: result.error });
      } else {
        setFormError(result.error ?? "Failed to save brand.");
      }
      return;
    }

    router.push("/admin/brands");
  }

  return (
    <Card className="max-w-2xl">
      <Card.Header>
        <Card.Title>{isEditMode ? "Edit Brand" : "Add Brand"}</Card.Title>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {formError && <p className="text-danger text-sm">{formError}</p>}

          <TextField
            control={control}
            name="name"
            label="Brand Name"
            placeholder="e.g. Canon"
            isRequired
          />
          <TextField
            control={control}
            name="slug"
            label="Slug"
            placeholder="auto-generated, editable"
          />
          <ImageUploadField
            control={control}
            name="logo"
            label="Logo"
            description="Click or drag to upload"
          />
          <ToggleField control={control} name="isActive" label="Active" />

          <FormActions
            isSubmitting={formState.isSubmitting}
            onCancel={() => router.push("/admin/brands")}
            saveLabel="Save Brand"
          />
        </form>
      </Card.Content>
    </Card>
  );
}
