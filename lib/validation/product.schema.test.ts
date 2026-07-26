import { describe, expect, it } from "vitest";
import { productCreateSchema, productUpdateSchema } from "./product.schema";

describe("productCreateSchema", () => {
  it("accepts a valid product", () => {
    const result = productCreateSchema.safeParse({
      name: "Boya BY-M1 Lavalier Mic",
      sku: "BOYA-BYM1-001",
      categoryId: "clx0001category",
      brandId: "clx0001brand",
      price: 24.99,
      discountPercent: 10,
      tags: ["microphone", "lavalier"],
      shortDescription: "Compact clip-on lavalier microphone.",
      longDescription: "A budget-friendly lavalier microphone with a 20-foot cable.",
      image: "https://cdn.example.com/products/boya-bym1.jpg",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a discountPercent outside 0-100", () => {
    const result = productCreateSchema.safeParse({
      name: "Boya BY-M1 Lavalier Mic",
      sku: "BOYA-BYM1-001",
      categoryId: "clx0001category",
      brandId: "clx0001brand",
      price: 24.99,
      discountPercent: 150,
      shortDescription: "Compact clip-on lavalier microphone.",
      longDescription: "A budget-friendly lavalier microphone with a 20-foot cable.",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });
});

describe("productUpdateSchema", () => {
  it("accepts a partial update", () => {
    const result = productUpdateSchema.safeParse({ price: 19.99 });
    expect(result.success).toBe(true);
  });

  it("rejects a negative price", () => {
    const result = productUpdateSchema.safeParse({ price: -5 });
    expect(result.success).toBe(false);
  });
});
