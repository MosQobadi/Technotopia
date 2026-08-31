import { describe, expect, it } from "vitest";
import { categoryCreateSchema, categoryUpdateSchema } from "./category.schema";

describe("categoryCreateSchema", () => {
  it("accepts a valid category", () => {
    const result = categoryCreateSchema.safeParse({
      name: "Cameras",
      slug: "cameras",
      tags: ["photography", "video"],
      shortDescription: "Digital cameras for every skill level.",
      longDescription: "From entry-level point-and-shoots to professional mirrorless bodies.",
      image: "/uploads/categories/cameras.jpg",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a slug that isn't kebab-case", () => {
    const result = categoryCreateSchema.safeParse({
      name: "Cameras",
      slug: "Cameras_And_Lenses!",
      tags: [],
      shortDescription: "Digital cameras for every skill level.",
      longDescription: "From entry-level point-and-shoots to professional mirrorless bodies.",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });
});

describe("categoryUpdateSchema", () => {
  it("accepts a partial update", () => {
    const result = categoryUpdateSchema.safeParse({ status: "INACTIVE" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status", () => {
    const result = categoryUpdateSchema.safeParse({ status: "ARCHIVED" });
    expect(result.success).toBe(false);
  });
});
