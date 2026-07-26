"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  FormActions,
  ImageUploadField,
  TagsInput,
  TextareaField,
  TextField,
  ToggleField,
} from "@/components/admin/form";
import { slugify } from "@/lib/slugify";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  tags: z.array(z.string().min(1).max(50)).max(20),
  shortDescription: z.string().min(1, "Short description is required").max(300),
  longDescription: z.string().min(1, "Long description is required").max(5000),
  image: z.union([z.instanceof(File), z.string(), z.null()]),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export interface CategoryFormCategory {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  shortDescription: string;
  longDescription: string;
  image: string | null;
  status: "ACTIVE" | "INACTIVE";
}

interface CategoryFormProps {
  category?: CategoryFormCategory;
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

export function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const isEditMode = !!category;
  const [formError, setFormError] = useState<string | null>(null);
  const lastAutoSlug = useRef(category?.slug ?? "");

  const { control, handleSubmit, formState, setValue, setError, getValues } =
    useForm<CategoryFormValues>({
      resolver: zodResolver(categoryFormSchema),
      defaultValues: {
        name: category?.name ?? "",
        slug: category?.slug ?? "",
        tags: category?.tags ?? [],
        shortDescription: category?.shortDescription ?? "",
        longDescription: category?.longDescription ?? "",
        image: category?.image ?? null,
        isActive: category ? category.status === "ACTIVE" : true,
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

  async function onSubmit(values: CategoryFormValues) {
    setFormError(null);

    let image: string | null;
    try {
      image = values.image instanceof File ? await uploadImage(values.image) : values.image;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to upload image.");
      return;
    }

    const payload = {
      name: values.name,
      slug: values.slug,
      tags: values.tags,
      shortDescription: values.shortDescription,
      longDescription: values.longDescription,
      image,
      status: values.isActive ? "ACTIVE" : "INACTIVE",
    };

    const response = await fetch(
      isEditMode ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
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
        setFormError(result.error ?? "Failed to save category.");
      }
      return;
    }

    router.push("/admin/categories");
  }

  return (
    <Card className="max-w-4xl">
      <Card.Header>
        <Card.Title>{isEditMode ? "Edit Category" : "Add Category"}</Card.Title>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {formError && <p className="text-danger text-sm">{formError}</p>}

          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <TextField
                control={control}
                name="name"
                label="Category Name"
                placeholder="e.g. Cameras"
                isRequired
              />
              <TextField
                control={control}
                name="slug"
                label="Slug"
                placeholder="auto-generated, editable"
              />
              <TagsInput
                control={control}
                name="tags"
                label="Tags"
                placeholder="e.g. electronics, photography"
              />
              <ToggleField control={control} name="isActive" label="Active" />
            </div>

            <div className="flex flex-col gap-5">
              <TextareaField
                control={control}
                name="shortDescription"
                label="Short Description"
                placeholder="One-line summary"
                rows={2}
              />
              <TextareaField
                control={control}
                name="longDescription"
                label="Long Description"
                placeholder="Full description"
                rows={5}
              />
              <ImageUploadField
                control={control}
                name="image"
                label="Category Image / Logo"
                description="Click or drag to upload"
              />
            </div>
          </div>

          <FormActions
            isSubmitting={formState.isSubmitting}
            onCancel={() => router.push("/admin/categories")}
            saveLabel="Save Category"
          />
        </form>
      </Card.Content>
    </Card>
  );
}
