import { LoadingPage, ProductGridSkeleton, Skeleton } from "@/components/storefront/ui/Skeleton";

// The home page reads the catalogue per request (it is force-dynamic), so a
// click on the logo from anywhere waits on the database. This is what it waits
// behind: the hero band and the first shelf. It lives in the (home) route group
// so that it stands in for the home page alone — at the storefront's root it
// would be the fallback for every page below it too.
export default function HomeLoading() {
  return (
    <LoadingPage>
      <div className="mx-auto max-w-320 px-6 py-14 sm:py-16">
        <Skeleton className="aspect-4/3 rounded-3xl sm:aspect-[21/8]" />
      </div>
      <div className="mx-auto max-w-320 px-6 pt-14 pb-2">
        <Skeleton className="mb-3 h-3 w-24 rounded-full" />
        <Skeleton className="mb-6 h-9 w-full max-w-md rounded-full" />
        <ProductGridSkeleton
          count={4}
          className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6"
        />
      </div>
    </LoadingPage>
  );
}
