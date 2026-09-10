import { describe, expect, it } from "vitest";
import { deriveInventoryStatus, LOW_STOCK_THRESHOLD } from "./inventory";

describe("deriveInventoryStatus", () => {
  it("is out of stock at zero", () => {
    expect(deriveInventoryStatus(0)).toBe("OUT_OF_STOCK");
  });

  it("is low from one to just under the threshold", () => {
    expect(deriveInventoryStatus(1)).toBe("LOW_STOCK");
    expect(deriveInventoryStatus(LOW_STOCK_THRESHOLD - 1)).toBe("LOW_STOCK");
  });

  it("is in stock from the threshold up", () => {
    expect(deriveInventoryStatus(LOW_STOCK_THRESHOLD)).toBe("IN_STOCK");
    expect(deriveInventoryStatus(500)).toBe("IN_STOCK");
  });

  it("reads a count below zero as out of stock, never as low", () => {
    expect(deriveInventoryStatus(-1)).toBe("OUT_OF_STOCK");
  });
});
