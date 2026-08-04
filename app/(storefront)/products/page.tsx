import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsContent } from "./ProductsContent";

interface ProductsPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { category } = await searchParams;

  if (category) {
    return {
      title: category,
      description: `Shop ${category} at Technotopia.`,
    };
  }

  return {
    title: "Shop All Products",
    description: "Browse the full Technotopia catalog of cameras, microphones, lights and speakers.",
  };
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
