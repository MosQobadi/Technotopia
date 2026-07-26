import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "./me/route";
import { hashPassword, signToken, getCookieName } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const ADMIN_EMAIL = "task22-admin@technotopia.test";
const CUSTOMER_EMAIL = "task22-customer@technotopia.test";
const PASSWORD = "correct-horse-battery-staple";

let adminId: string;

beforeAll(async () => {
  const passwordHash = await hashPassword(PASSWORD);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: "Task22",
      lastName: "Admin",
      role: Role.ADMIN,
    },
  });
  adminId = admin.id;

  await prisma.user.create({
    data: {
      email: CUSTOMER_EMAIL,
      passwordHash,
      firstName: "Task22",
      lastName: "Customer",
      role: Role.CUSTOMER,
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

function loginRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function meRequest(cookieValue?: string) {
  return new NextRequest("http://localhost/api/auth/me", {
    headers: cookieValue ? { cookie: `${getCookieName()}=${cookieValue}` } : {},
  });
}

describe("POST /api/auth/login", () => {
  it("logs in an admin, returns the safe user, and sets the auth cookie", async () => {
    const response = await login(loginRequest({ email: ADMIN_EMAIL, password: PASSWORD }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: expect.objectContaining({ id: adminId, email: ADMIN_EMAIL, role: Role.ADMIN }),
    });
    expect(body.data.passwordHash).toBeUndefined();

    const cookie = response.cookies.get(getCookieName());
    expect(cookie?.value).toBeTruthy();
  });

  it("rejects a wrong password with a generic error", async () => {
    const response = await login(loginRequest({ email: ADMIN_EMAIL, password: "wrong-password" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ success: false, error: expect.any(String) });
  });

  it("rejects an unknown email with the same generic error", async () => {
    const response = await login(
      loginRequest({ email: "nobody@technotopia.test", password: PASSWORD }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ success: false, error: expect.any(String) });
  });

  it("rejects a CUSTOMER-role login with a clear, distinct error", async () => {
    const response = await login(loginRequest({ email: CUSTOMER_EMAIL, password: PASSWORD }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/admin/i);
  });

  it("rejects an invalid request body with a 400", async () => {
    const response = await login(loginRequest({ email: "not-an-email", password: "" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid session cookie", async () => {
    const token = await signToken({ userId: adminId, role: Role.ADMIN });
    const response = await me(meRequest(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: expect.objectContaining({ id: adminId, email: ADMIN_EMAIL }),
    });
  });

  it("returns 401 when no cookie is present", async () => {
    const response = await me(meRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 401 for an expired token", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const { SignJWT } = await import("jose");
    const expiredToken = await new SignJWT({ userId: adminId, role: Role.ADMIN })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(nowSeconds - 20)
      .setExpirationTime(nowSeconds - 10)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

    const response = await me(meRequest(expiredToken));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 401 for a malformed token", async () => {
    const response = await me(meRequest("not-a-real-token"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the auth cookie", async () => {
    const response = await logout();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: null });

    const cookie = response.cookies.get(getCookieName());
    expect(cookie?.value).toBe("");
  });
});
