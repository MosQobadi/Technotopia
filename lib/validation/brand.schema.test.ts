import { describe, expect, it } from "vitest";
import { brandCreateSchema, brandUpdateSchema } from "./brand.schema";

describe("brandCreateSchema", () => {
  it("accepts a valid brand", () => {
    const result = brandCreateSchema.safeParse({
      name: "Sony",
      slug: "sony",
      logo: "/uploads/brands/sony.png",
      status: "ACTIVE",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = brandCreateSchema.safeParse({
      slug: "sony",
      status: "ACTIVE",
    });

    expect(result.success).toBe(false);
  });
});

describe("brandUpdateSchema", () => {
  it("accepts a partial update", () => {
    const result = brandUpdateSchema.safeParse({ name: "Sony Corp" });
    expect(result.success).toBe(true);
  });

  it("rejects a non-url logo", () => {
    const result = brandUpdateSchema.safeParse({ logo: "not-a-url" });
    expect(result.success).toBe(false);
  });
});
