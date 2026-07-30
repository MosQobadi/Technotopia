"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { DataTable, StatusPill, type DataTableColumn } from "@/components/admin/DataTable";
import { DeleteBannerAction } from "./DeleteBannerAction";

interface BannerRow {
  id: string;
  image: string;
  headline: string;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
}

interface BannersApiResponse {
  success: boolean;
  data?: { banners: BannerRow[]; total: number };
  error?: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

export function BannersTable() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const loadBanners = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/banners?${params}`);
      const result: BannersApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load banners.");
        return;
      }
      setBanners(result.data.banners);
      setTotal(result.data.total);
    } catch {
      setError("Failed to load banners.");
    }
  }, [page, status]);

  useEffect(() => {
    startTransition(loadBanners);
  }, [loadBanners, startTransition]);

  const columns: DataTableColumn<BannerRow>[] = [
    {
      key: "image",
      label: "Image",
      render: (row) =>
        row.image ? (
          // Banner images may live on hosts not configured in next.config's remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.image} alt="" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div
            className="bg-surface-secondary border-border flex h-10 w-10 items-center justify-center rounded-md border text-lg"
            aria-hidden
          >
            🖼
          </div>
        ),
    },
    { key: "headline", label: "Headline" },
    { key: "displayOrder", label: "Display Order" },
    { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/content/banners/${row.id}/edit`}
            className="text-accent text-sm hover:underline"
          >
            Edit
          </Link>
          <DeleteBannerAction
            bannerId={row.id}
            bannerHeadline={row.headline}
            onDeleted={() => startTransition(loadBanners)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-danger text-sm">{error}</p>}

      <DataTable
        aria-label="Banners"
        columns={columns}
        rows={banners}
        filters={[
          {
            label: "Status",
            value: status,
            options: STATUS_OPTIONS,
            onChange: (value) => {
              setStatus(value);
              setPage(1);
            },
          },
        ]}
        actions={
          <Link
            href="/admin/content/banners/add"
            className="bg-accent text-accent-foreground hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            + Add Banner
          </Link>
        }
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        emptyMessage={isLoading ? "Loading banners..." : "No banners found."}
      />
    </div>
  );
}
