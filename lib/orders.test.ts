import { describe, expect, it } from "vitest";
import { nextOrderStep, ORDER_STEPS, orderStepIndex } from "./orders";

describe("orderStepIndex", () => {
  it("places each step in order", () => {
    expect(ORDER_STEPS.map(orderStepIndex)).toEqual([0, 1, 2, 3]);
  });

  it("puts a cancelled order on no step at all", () => {
    expect(orderStepIndex("CANCELLED")).toBe(-1);
  });
});

describe("nextOrderStep", () => {
  it("walks forward one step at a time", () => {
    expect(nextOrderStep("PENDING")).toBe("SENDING");
    expect(nextOrderStep("SENDING")).toBe("SENT");
    expect(nextOrderStep("SENT")).toBe("DELIVERED");
  });

  it("has nowhere to go from delivered or cancelled", () => {
    expect(nextOrderStep("DELIVERED")).toBeNull();
    expect(nextOrderStep("CANCELLED")).toBeNull();
  });
});
