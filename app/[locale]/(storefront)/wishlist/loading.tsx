import { LoadingPage, ProductGridSkeleton, Skeleton } from "@/components/storefront/ui/Skeleton";

// Read per request from the session and the database.
export default function WishlistLoading() {
  return (
    <LoadingPage className="mx-auto max-w-320 px-6 py-10 pb-24">
      <Skeleton className="mb-5 h-3 w-32 rounded-full" />
      <Skeleton className="mb-8 h-9 w-56 rounded-full" />
      <ProductGridSkeleton
        count={4}
        className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6"
      />
    </LoadingPage>
  );
}
