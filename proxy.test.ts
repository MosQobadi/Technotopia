import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { signToken } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-proxy-tests";
  process.env.COOKIE_NAME = "technotopia_session";
});

function requestFor(pathname: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.cookie = `${process.env.COOKIE_NAME}=${token}`;
  }
  return new NextRequest(new URL(pathname, "http://localhost:3000"), { headers });
}

describe("proxy", () => {
  it("redirects an unauthenticated request to /admin/products to /login with a from param", async () => {
    const response = await proxy(requestFor("/admin/products"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("from")).toBe("/admin/products");
  });

  it("redirects when the token is invalid or expired", async () => {
    const response = await proxy(requestFor("/admin/products", "not-a-real-token"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("redirects a non-admin (CUSTOMER) user away from /admin", async () => {
    const token = await signToken({ userId: "user_1", role: Role.CUSTOMER });
    const response = await proxy(requestFor("/admin/products", token));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("allows an authenticated ADMIN user through", async () => {
    const token = await signToken({ userId: "user_2", role: Role.ADMIN });
    const response = await proxy(requestFor("/admin/products", token));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
