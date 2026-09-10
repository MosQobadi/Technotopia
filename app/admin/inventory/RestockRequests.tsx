"use client";

import { Button } from "@heroui/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";

// Who is waiting for this product to come back, inside the stock modal — the
// one place an admin already opens when they restock. Nothing sends for them:
// each contact is a mailto:/tel: link to reach by hand, and "Mark notified"
// then stamps exactly the rows on screen, so a request that arrived while the
// modal was open stays pending instead of being cleared unseen.
// Renders nothing while loading or when no one is waiting, so the modal is
// unchanged for the products nobody has asked about.

interface PendingRequest {
  id: string;
  contact: string;
  createdAt: string;
}

interface RestockRequestsProps {
  productId: string;
}

function contactHref(contact: string): string {
  return contact.includes("@") ? `mailto:${contact}` : `tel:${contact}`;
}

export function RestockRequests({ productId }: RestockRequestsProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    let ignore = false;

    fetch(`/api/admin/inventory/${productId}/notifications`)
      .then((response) => response.json())
      .then((result: { success: boolean; data?: PendingRequest[]; error?: string }) => {
        if (ignore) return;
        if (result.success && result.data) setRequests(result.data);
        else setError(result.error ?? "Failed to load restock requests.");
      })
      .catch(() => {
        if (!ignore) setError("Failed to load restock requests.");
      });

    return () => {
      ignore = true;
    };
  }, [productId]);

  async function markNotified() {
    setIsMarking(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/inventory/${productId}/notifications`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: requests.map((request) => request.id) }),
      });
      const result = await response.json();
      if (result.success) setRequests([]);
      else setError(result.error ?? "Failed to mark requests as notified.");
    } catch {
      setError("Failed to mark requests as notified.");
    } finally {
      setIsMarking(false);
    }
  }

  if (error) return <p className="text-danger mt-4 text-sm">{error}</p>;
  if (requests.length === 0) return null;

  return (
    <section aria-labelledby="restock-requests-heading" className="border-border mt-4 border-t pt-4">
      <h3 id="restock-requests-heading" className="text-foreground text-sm font-medium">
        Waiting for restock ({requests.length})
      </h3>
      <p className="text-muted mt-1 text-xs">
        Nothing is sent automatically. Contact them, then mark them notified.
      </p>

      <ul className="mt-3 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
        {requests.map((request) => (
          <li key={request.id} className="flex items-center justify-between gap-3 text-sm">
            <a
              href={contactHref(request.contact)}
              dir="ltr"
              className="text-accent truncate hover:underline"
            >
              {request.contact}
            </a>
            <span className="text-muted shrink-0 text-xs">
              {format(new Date(request.createdAt), "MMM d, yyyy")}
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onPress={markNotified}
        isDisabled={isMarking}
      >
        {isMarking ? "Saving..." : `Mark ${requests.length} as notified`}
      </Button>
    </section>
  );
}
