import { describe, expect, it } from "vitest";
import { orderNoteSchema, orderStatusUpdateSchema } from "./order.schema";

describe("orderStatusUpdateSchema", () => {
  it("accepts a valid status", () => {
    const result = orderStatusUpdateSchema.safeParse({ status: "SENDING" });
    expect(result.success).toBe(true);
  });

  it("rejects a status that isn't in the OrderStatus enum", () => {
    const result = orderStatusUpdateSchema.safeParse({ status: "SHIPPED" });
    expect(result.success).toBe(false);
  });
});

describe("orderNoteSchema", () => {
  it("accepts a valid note", () => {
    const result = orderNoteSchema.safeParse({
      adminNote: "Customer requested delivery after 6pm.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a note over the max length", () => {
    const result = orderNoteSchema.safeParse({ adminNote: "a".repeat(5001) });
    expect(result.success).toBe(false);
  });
});
