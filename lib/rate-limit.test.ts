import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

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
