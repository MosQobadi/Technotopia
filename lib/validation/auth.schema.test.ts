import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth.schema";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "admin@technotopia.test",
      password: "hunter2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "hunter2",
    });
    expect(result.success).toBe(false);
  });
});
