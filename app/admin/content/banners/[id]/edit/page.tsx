"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BannerForm, type BannerFormBanner } from "../../BannerForm";

interface BannerApiResponse {
  success: boolean;
  data?: BannerFormBanner;
  error?: string;
}

export default function EditBannerPage() {
  const { id } = useParams<{ id: string }>();
  const [banner, setBanner] = useState<BannerFormBanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/banners/${id}`);
        const result: BannerApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error ?? "Failed to load banner.");
          return;
        }
        setBanner(result.data);
      } catch {
        if (!cancelled) setError("Failed to load banner.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!banner) return <p className="text-muted text-sm">Loading banner...</p>;

  return <BannerForm banner={banner} />;
}
