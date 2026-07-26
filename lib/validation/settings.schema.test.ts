import { describe, expect, it } from "vitest";
import { settingsSchema } from "./settings.schema";

describe("settingsSchema", () => {
  it("accepts a partial key/value update", () => {
    const result = settingsSchema.safeParse({
      storeName: "Technotopia",
      supportEmail: "support@technotopia.test",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty object", () => {
    const result = settingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
