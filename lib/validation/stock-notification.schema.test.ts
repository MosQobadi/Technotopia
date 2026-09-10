import { describe, expect, it } from "vitest";
import {
  stockNotificationCreateSchema,
  stockNotificationMarkSchema,
} from "./stock-notification.schema";

function contactOf(raw: string): string | null {
  const parsed = stockNotificationCreateSchema.safeParse({ contact: raw });
  return parsed.success ? parsed.data.contact : null;
}

describe("stockNotificationCreateSchema", () => {
  it("stores an email trimmed and lowercased", () => {
    expect(contactOf("  Ali@Example.COM ")).toBe("ali@example.com");
  });

  it("stores a phone number without its separators", () => {
    expect(contactOf("0912 345-6789")).toBe("09123456789");
    expect(contactOf("+98 (912) 345 6789")).toBe("+989123456789");
  });

  it("reads a phone number typed in Persian or Arabic-Indic digits", () => {
    expect(contactOf("۰۹۱۲ ۳۴۵ ۶۷۸۹")).toBe("09123456789");
    expect(contactOf("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("rejects what is neither", () => {
    expect(contactOf("")).toBeNull();
    expect(contactOf("hello")).toBeNull();
    expect(contactOf("12345")).toBeNull();
    expect(contactOf("ali@")).toBeNull();
    expect(contactOf("1234567890123456")).toBeNull();
  });
});

describe("stockNotificationMarkSchema", () => {
  it("needs at least one id", () => {
    expect(stockNotificationMarkSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(stockNotificationMarkSchema.safeParse({ ids: ["a"] }).success).toBe(true);
  });
});
