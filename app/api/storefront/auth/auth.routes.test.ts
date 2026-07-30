import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as signup } from "./signup/route";
import { POST as login } from "./login/route";
import { getCookieName } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const SIGNUP_EMAIL = "task15-2-customer@technotopia.test";
const SIGNUP_PHONE = "+98 910 000 15 02";
const PASSWORD = "correct-horse-battery-staple";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: SIGNUP_EMAIL } });
  await prisma.$disconnect();
});

function signupRequest(body: unknown) {
  return new NextRequest("http://localhost/api/storefront/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function loginRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/storefront/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/storefront/auth/signup", () => {
  it("creates a CUSTOMER user, sets the auth cookie, and returns the safe user", async () => {
    const response = await signup(
      signupRequest({
        fullName: "Task Fifteen Customer",
        email: SIGNUP_EMAIL,
        phone: SIGNUP_PHONE,
        password: PASSWORD,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: expect.objectContaining({
        email: SIGNUP_EMAIL,
        phone: SIGNUP_PHONE,
        firstName: "Task",
        lastName: "Fifteen Customer",
        role: Role.CUSTOMER,
      }),
    });
    expect(body.data.passwordHash).toBeUndefined();

    const cookie = response.cookies.get(getCookieName());
    expect(cookie?.value).toBeTruthy();
  });

  it("rejects a duplicate email", async () => {
    const response = await signup(
      signupRequest({
        fullName: "Another Person",
        email: SIGNUP_EMAIL,
        phone: "+98 910 000 15 03",
        password: PASSWORD,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
  });

  it("rejects an invalid request body with a 400", async () => {
    const response = await signup(
      signupRequest({ fullName: "", email: "not-an-email", phone: "", password: "short" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe("POST /api/storefront/auth/login", () => {
  it("logs in a CUSTOMER by email without requiring the ADMIN role", async () => {
    const response = await login(loginRequest({ identifier: SIGNUP_EMAIL, password: PASSWORD }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: expect.objectContaining({ email: SIGNUP_EMAIL, role: Role.CUSTOMER }),
    });

    const cookie = response.cookies.get(getCookieName());
    expect(cookie?.value).toBeTruthy();
  });

  it("logs in a CUSTOMER by phone", async () => {
    const response = await login(loginRequest({ identifier: SIGNUP_PHONE, password: PASSWORD }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.email).toBe(SIGNUP_EMAIL);
  });

  it("rejects a wrong password with a generic error", async () => {
    const response = await login(
      loginRequest({ identifier: SIGNUP_EMAIL, password: "wrong-password" }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("rejects an unknown identifier with the same generic error", async () => {
    const response = await login(
      loginRequest({ identifier: "nobody@technotopia.test", password: PASSWORD }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("rejects an invalid request body with a 400", async () => {
    const response = await login(loginRequest({ identifier: "", password: "" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});
