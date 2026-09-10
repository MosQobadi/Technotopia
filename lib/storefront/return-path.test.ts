import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./return-path";

describe("safeReturnPath", () => {
  it("keeps a path on this site", () => {
    expect(safeReturnPath("/checkout")).toBe("/checkout");
    expect(safeReturnPath("/products?category=cameras")).toBe("/products?category=cameras");
  });

  it("refuses anything a browser would read as another host", () => {
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeReturnPath("/\\evil.example")).toBeNull();
    expect(safeReturnPath("https://evil.example")).toBeNull();
    expect(safeReturnPath("javascript:alert(1)")).toBeNull();
  });

  it("has nothing to return to without a value", () => {
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath("")).toBeNull();
    expect(safeReturnPath("checkout")).toBeNull();
  });
});
