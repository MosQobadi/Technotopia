import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "./rate-limit";

describe("getClientIp", () => {
  function request(headers: Record<string, string>) {
    return new NextRequest("http://localhost/", { headers });
  }

  it("takes the address Nginx set over any the client sent", () => {
    const ip = getClientIp(
      request({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1, 203.0.113.7" }),
    );
    expect(ip).toBe("203.0.113.7");
  });

  it("falls back to the hop Nginx appended, not the one the client wrote", () => {
    // The first entry is whatever the client put in its own header; varying it
    // must not buy a fresh allowance.
    expect(getClientIp(request({ "x-forwarded-for": "198.51.100.1, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("has nothing to go on without either header", () => {
    expect(getClientIp(request({}))).toBe("unknown");
  });
});

const WINDOW_MS = 1000;
const MAX_ATTEMPTS = 3;

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit and then blocks", () => {
    const key = `test-${Math.random()}`;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS).allowed).toBe(true);
    }

    const blocked = checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets once the window elapses", () => {
    const key = `test-${Math.random()}`;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
    }
    expect(checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS).allowed).toBe(false);

    vi.advanceTimersByTime(WINDOW_MS + 1);

    expect(checkRateLimit(key, MAX_ATTEMPTS, WINDOW_MS).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkRateLimit(keyA, MAX_ATTEMPTS, WINDOW_MS);
    }
    expect(checkRateLimit(keyA, MAX_ATTEMPTS, WINDOW_MS).allowed).toBe(false);
    expect(checkRateLimit(keyB, MAX_ATTEMPTS, WINDOW_MS).allowed).toBe(true);
  });
});
