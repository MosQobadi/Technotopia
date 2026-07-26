import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signToken, verifyToken, type AuthTokenPayload } from "./jwt";
import { Role } from "@/lib/generated/prisma/enums";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests";
});

const payload: AuthTokenPayload = { userId: "user_123", role: Role.ADMIN };

describe("signToken / verifyToken", () => {
  it("signs a token and verifies it back to the original payload", async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result).toEqual(payload);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await new SignJWT({
      userId: payload.userId,
      role: payload.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("a-different-secret"));

    const result = await verifyToken(token);
    expect(result).toBeNull();
  });

  it("rejects an expired token", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredToken = await new SignJWT({
      userId: payload.userId,
      role: payload.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(nowSeconds - 20)
      .setExpirationTime(nowSeconds - 10)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

    const result = await verifyToken(expiredToken);
    expect(result).toBeNull();
  });

  it("rejects a malformed token", async () => {
    const result = await verifyToken("not-a-real-token");
    expect(result).toBeNull();
  });
});
