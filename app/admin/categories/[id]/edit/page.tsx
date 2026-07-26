"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CategoryForm, type CategoryFormCategory } from "../../CategoryForm";

interface CategoryApiResponse {
  success: boolean;
  data?: CategoryFormCategory;
  error?: string;
}

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<CategoryFormCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/categories/${id}`);
        const result: CategoryApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error ?? "Failed to load category.");
          return;
        }
        setCategory(result.data);
      } catch {
        if (!cancelled) setError("Failed to load category.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!category) return <p className="text-muted text-sm">Loading category...</p>;

  return <CategoryForm category={category} />;
}
