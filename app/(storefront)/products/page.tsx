import { Suspense } from "react";
import { ProductsContent } from "./ProductsContent";

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
