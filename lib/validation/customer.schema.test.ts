import { describe, expect, it } from "vitest";
import { customerStatusSchema } from "./customer.schema";

describe("customerStatusSchema", () => {
  it("accepts a valid status", () => {
    const result = customerStatusSchema.safeParse({ status: "INACTIVE" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status", () => {
    const result = customerStatusSchema.safeParse({ status: "BANNED" });
    expect(result.success).toBe(false);
  });
});
