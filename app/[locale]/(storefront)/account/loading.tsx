import { LoadingPage, Skeleton } from "@/components/storefront/ui/Skeleton";

// Profile, order history and addresses, read per request. The outline is the
// profile tab, which is the one the page opens on.
export default function AccountLoading() {
  return (
    <LoadingPage className="mx-auto max-w-225 px-6 py-10 pb-24">
      <Skeleton className="mb-5 h-3 w-32 rounded-full" />
      <Skeleton className="mb-7 h-9 w-48 rounded-full" />
      <Skeleton className="mb-8 h-11 w-full max-w-md rounded-full" />

      <div className="grid max-w-140 grid-cols-2 gap-4">
        <Skeleton className="col-span-2 h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
    </LoadingPage>
  );
}
