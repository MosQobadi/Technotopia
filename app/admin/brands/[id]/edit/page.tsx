"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandForm, type BrandFormBrand } from "../../BrandForm";

interface BrandApiResponse {
  success: boolean;
  data?: BrandFormBrand;
  error?: string;
}

export default function EditBrandPage() {
  const { id } = useParams<{ id: string }>();
  const [brand, setBrand] = useState<BrandFormBrand | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/brands/${id}`);
        const result: BrandApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error ?? "Failed to load brand.");
          return;
        }
        setBrand(result.data);
      } catch {
        if (!cancelled) setError("Failed to load brand.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!brand) return <p className="text-muted text-sm">Loading brand...</p>;

  return <BrandForm brand={brand} />;
}
