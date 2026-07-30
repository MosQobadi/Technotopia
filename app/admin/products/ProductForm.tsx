"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  FormActions,
  ImageUploadField,
  SelectField,
  type SelectFieldOption,
  TagsInput,
  TextareaField,
  TextField,
  ToggleField,
} from "@/components/admin/form";

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "SKU may only contain letters, numbers, - and _"),
  categoryId: z.string().min(1, "Category is required"),
  brandId: z.string().min(1, "Brand is required"),
  tags: z.array(z.string().min(1).max(50)).max(20),
  shortDescription: z.string().min(1, "Short description is required").max(300),
  longDescription: z.string().min(1, "Long description is required").max(5000),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
      "Price must be a whole number of Rial",
    ),
  discountPercent: z
    .string()
    .refine(
      (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
      "Discount must be between 0 and 100",
    ),
  image: z.union([z.instanceof(File), z.string(), z.null()]),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export interface ProductFormProduct {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  brandId: string;
  tags: string[];
  shortDescription: string;
  longDescription: string;
  price: number;
  discountPercent: number;
  image: string | null;
  status: "ACTIVE" | "INACTIVE";
  isFeatured: boolean;
}

interface ProductFormProps {
  product?: ProductFormProduct;
}

interface Option {
  id: string;
  name: string;
}

interface OptionsApiResponse {
  success: boolean;
  data?: Option[];
  error?: string;
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

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEditMode = !!product;
  const [formError, setFormError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<SelectFieldOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectFieldOption[]>([]);

  const { control, handleSubmit, formState, setError } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      categoryId: product?.categoryId ?? "",
      brandId: product?.brandId ?? "",
      tags: product?.tags ?? [],
      shortDescription: product?.shortDescription ?? "",
      longDescription: product?.longDescription ?? "",
      price: product ? String(product.price) : "",
      discountPercent: product ? String(product.discountPercent) : "0",
      image: product?.image ?? null,
      isActive: product ? product.status === "ACTIVE" : true,
      isFeatured: product?.isFeatured ?? false,
    },
  });

  useEffect(() => {
    async function loadOptions() {
      const [categoryRes, brandRes] = await Promise.all([
        fetch("/api/admin/categories/options"),
        fetch("/api/admin/brands/options"),
      ]);
      const categoryResult: OptionsApiResponse = await categoryRes.json();
      const brandResult: OptionsApiResponse = await brandRes.json();
      if (categoryResult.success && categoryResult.data) {
        setCategoryOptions(categoryResult.data.map((o) => ({ label: o.name, value: o.id })));
      }
      if (brandResult.success && brandResult.data) {
        setBrandOptions(brandResult.data.map((o) => ({ label: o.name, value: o.id })));
      }
    }
    loadOptions();
  }, []);

  const priceWatch = useWatch({ control, name: "price" });
  const discountWatch = useWatch({ control, name: "discountPercent" });

  const finalPrice = useMemo(() => {
    const price = Number(priceWatch);
    if (!priceWatch || Number.isNaN(price) || price < 0) return null;
    const discount = discountWatch && !Number.isNaN(Number(discountWatch)) ? Number(discountWatch) : 0;
    return Math.round(price * (1 - discount / 100));
  }, [priceWatch, discountWatch]);

  async function onSubmit(values: ProductFormValues) {
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
      sku: values.sku,
      categoryId: values.categoryId,
      brandId: values.brandId,
      tags: values.tags,
      shortDescription: values.shortDescription,
      longDescription: values.longDescription,
      price: Number(values.price),
      discountPercent: values.discountPercent === "" ? 0 : Number(values.discountPercent),
      image,
      status: values.isActive ? "ACTIVE" : "INACTIVE",
      isFeatured: values.isFeatured,
    };

    const response = await fetch(
      isEditMode ? `/api/admin/products/${product.id}` : "/api/admin/products",
      {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();

    if (!result.success) {
      if (/sku/i.test(result.error ?? "")) {
        setError("sku", { message: result.error });
      } else {
        setFormError(result.error ?? "Failed to save product.");
      }
      return;
    }

    router.push("/admin/products");
  }

  return (
    <Card className="max-w-4xl">
      <Card.Header>
        <Card.Title>{isEditMode ? "Edit Product" : "Add Product"}</Card.Title>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {formError && <p className="text-danger text-sm">{formError}</p>}

          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <TextField
                control={control}
                name="name"
                label="Product Name"
                placeholder="e.g. Wireless Mouse"
                isRequired
              />
              <TextField control={control} name="sku" label="SKU" placeholder="e.g. WM-2024" isRequired />
              <SelectField
                control={control}
                name="categoryId"
                label="Category"
                options={categoryOptions}
                isRequired
              />
              <SelectField control={control} name="brandId" label="Brand" options={brandOptions} isRequired />
              <TagsInput control={control} name="tags" label="Tags" placeholder="e.g. wireless, ergonomic" />
              <ToggleField control={control} name="isActive" label="Active" />
              <ToggleField control={control} name="isFeatured" label="Featured" />
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
              <div className="grid grid-cols-2 gap-4">
                <TextField control={control} name="price" label="Price" type="number" isRequired />
                <TextField control={control} name="discountPercent" label="Discount %" type="number" />
              </div>
              <div>
                <p className="text-muted text-sm">Final Price</p>
                <p className="text-lg font-medium">
                  {finalPrice !== null ? `$${finalPrice.toLocaleString()}` : "—"}
                </p>
              </div>
              <ImageUploadField
                control={control}
                name="image"
                label="Product Image"
                description="Click or drag to upload"
              />
            </div>
          </div>

          <p className="text-muted text-sm">
            Stock is not edited here — manage stock from the Inventory screen.
          </p>

          <FormActions
            isSubmitting={formState.isSubmitting}
            onCancel={() => router.push("/admin/products")}
            saveLabel="Save Product"
          />
        </form>
      </Card.Content>
    </Card>
  );
}
