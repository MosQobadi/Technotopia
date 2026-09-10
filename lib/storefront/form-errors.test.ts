import { describe, expect, it } from "vitest";
import { fieldErrorKey, requestFailure } from "./form-errors";

describe("requestFailure", () => {
  it("names the statuses the form handles", () => {
    expect(requestFailure(401, ["unauthorized", "rateLimited"])).toBe("unauthorized");
    expect(requestFailure(429, ["unauthorized", "rateLimited"])).toBe("rateLimited");
    expect(requestFailure(409, ["conflict"])).toBe("conflict");
  });

  it("calls a known status the form has no words for plain failed", () => {
    expect(requestFailure(409, ["unauthorized", "rateLimited"])).toBe("failed");
  });

  it("calls a server error, a bad request and no response at all failed", () => {
    expect(requestFailure(500, ["unauthorized", "conflict"])).toBe("failed");
    expect(requestFailure(400, ["unauthorized", "conflict"])).toBe("failed");
    expect(requestFailure(undefined, ["unauthorized", "conflict"])).toBe("failed");
  });
});

describe("fieldErrorKey", () => {
  it("reads an empty field as required", () => {
    expect(fieldErrorKey("too_small")).toBe("required");
  });

  it("reads an over-long field as too long", () => {
    expect(fieldErrorKey("too_big")).toBe("tooLong");
  });

  it("reads a malformed email as an email error", () => {
    expect(fieldErrorKey("invalid_format")).toBe("email");
  });

  it("falls back to required for anything else", () => {
    expect(fieldErrorKey("invalid_type")).toBe("required");
  });
});
