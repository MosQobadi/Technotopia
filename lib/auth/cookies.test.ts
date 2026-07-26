import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { clearAuthCookie, setAuthCookie, type CookieStore } from "./cookies";

beforeAll(() => {
  process.env.COOKIE_NAME = "technotopia_session";
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function createMockCookieStore() {
  const set = vi.fn<CookieStore["set"]>();
  const store: CookieStore = { set };
  return { store, set };
}

describe("setAuthCookie", () => {
  it("sets an HTTP-only cookie under COOKIE_NAME with the token as value", () => {
    const { store, set } = createMockCookieStore();
    setAuthCookie(store, "signed.jwt.token");

    expect(set).toHaveBeenCalledWith(
      "technotopia_session",
      "signed.jwt.token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      }),
    );
  });

  it("marks the cookie secure only in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const dev = createMockCookieStore();
    setAuthCookie(dev.store, "token");
    expect(dev.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );

    vi.stubEnv("NODE_ENV", "production");
    const prod = createMockCookieStore();
    setAuthCookie(prod.store, "token");
    expect(prod.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });
});

describe("clearAuthCookie", () => {
  it("overwrites the cookie with an empty value and zero maxAge", () => {
    const { store, set } = createMockCookieStore();
    clearAuthCookie(store);

    expect(set).toHaveBeenCalledWith(
      "technotopia_session",
      "",
      expect.objectContaining({ maxAge: 0, httpOnly: true, sameSite: "lax" }),
    );
  });
});
