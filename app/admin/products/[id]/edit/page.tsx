"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductForm, type ProductFormProduct } from "../../ProductForm";

interface ProductApiResponse {
  success: boolean;
  data?: ProductFormProduct;
  error?: string;
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductFormProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/products/${id}`);
        const result: ProductApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error ?? "Failed to load product.");
          return;
        }
        setProduct(result.data);
      } catch {
        if (!cancelled) setError("Failed to load product.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!product) return <p className="text-muted text-sm">Loading product...</p>;

  return <ProductForm product={product} />;
}
