import { describe, expect, it } from "vitest";
import { formatOrderNumber, formatPrice } from "./format";

describe("formatPrice", () => {
  it("prints rials in Persian digits, grouped, with the unit after", () => {
    expect(formatPrice(1_250_000)).toBe("۱٬۲۵۰٬۰۰۰ ریال");
  });
});

describe("formatOrderNumber", () => {
  it("is the id's last eight characters, upper-cased, behind a hash", () => {
    expect(formatOrderNumber("cmf3x9k2q0000abcd1234efgh")).toBe("#1234EFGH");
  });
});
