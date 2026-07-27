"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CustomerDetails, type CustomerDetailData } from "../CustomerDetails";

interface CustomerApiResponse {
  success: boolean;
  data?: CustomerDetailData;
  error?: string;
}

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/customers/${id}`);
        const result: CustomerApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error ?? "Failed to load customer.");
          return;
        }
        setCustomer(result.data);
      } catch {
        if (!cancelled) setError("Failed to load customer.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!customer) return <p className="text-muted text-sm">Loading customer...</p>;

  return <CustomerDetails customer={customer} onCustomerChange={setCustomer} />;
}
