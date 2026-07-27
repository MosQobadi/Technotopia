"use client";

import { Card } from "@heroui/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { RecentOrdersTable, type RecentOrderRow } from "./RecentOrdersTable";

interface DashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  activeProductCount: number;
  lowStockCount: number;
  recentOrders: RecentOrderRow[];
  recentOrdersTotal: number;
}

interface DashboardApiResponse {
  success: boolean;
  data?: DashboardSummary;
  error?: string;
}

const PAGE_SIZE = 5;

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function DashboardContent() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();

  const loadSummary = useCallback(async () => {
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });

    try {
      const response = await fetch(`/api/admin/dashboard/summary?${params}`);
      const result: DashboardApiResponse = await response.json();
      if (!result.success || !result.data) {
        setError(result.error ?? "Failed to load dashboard data.");
        return;
      }
      setSummary(result.data);
    } catch {
      setError("Failed to load dashboard data.");
    }
  }, [page]);

  useEffect(() => {
    startTransition(loadSummary);
  }, [loadSummary, startTransition]);

  const stats = [
    { label: "Total Orders", value: summary ? summary.totalOrders.toLocaleString() : "—" },
    { label: "Revenue", value: summary ? currencyFormatter.format(summary.totalRevenue) : "—" },
    { label: "Products", value: summary ? summary.activeProductCount.toLocaleString() : "—" },
    { label: "Low Stock", value: summary ? summary.lowStockCount.toLocaleString() : "—" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <Card.Header>
              <Card.Title>{stat.label}</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-foreground text-3xl font-semibold">{stat.value}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-foreground text-lg font-semibold">Recent Orders</h2>
        <RecentOrdersTable
          orders={summary?.recentOrders ?? []}
          total={summary?.recentOrdersTotal ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </section>
    </div>
  );
}
