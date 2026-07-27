import { describe, expect, it } from "vitest";
import { freeTextSchema } from "./common";

describe("freeTextSchema", () => {
  it("strips HTML tags from the input", () => {
    const schema = freeTextSchema(1, 300);
    const result = schema.safeParse("<script>alert(1)</script>Hello <b>world</b>");

    expect(result.success).toBe(true);
    expect(result.data).toBe("alert(1)Hello world");
  });

  it("rejects input that is entirely markup once stripped", () => {
    const schema = freeTextSchema(1, 300);
    const result = schema.safeParse("<div></div>");

    expect(result.success).toBe(false);
  });

  it("enforces the max length after stripping", () => {
    const schema = freeTextSchema(0, 5);
    const result = schema.safeParse("<b>toolong</b>");

    expect(result.success).toBe(false);
  });
});
