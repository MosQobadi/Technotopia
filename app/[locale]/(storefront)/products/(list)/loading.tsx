import { LoadingPage, ProductGridSkeleton, Skeleton } from "@/components/storefront/ui/Skeleton";

// The listing renders per request from its query string, so every filter,
// sort and page change is a server round trip. This is the outline shown for
// it: breadcrumb, heading, the filter rail and a grid.
export default function ProductsLoading() {
  return (
    <LoadingPage className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <Skeleton className="mb-5 h-3 w-32 rounded-full" />
      <Skeleton className="mb-8 h-9 w-48 rounded-full" />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[220px_1fr]">
        <Skeleton className="h-80 rounded-[20px]" />

        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </LoadingPage>
  );
}
