import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task111";

let adminCookie: string;
let customerCookie: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: "task111-admin-id", role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task111-customer-id", role: Role.CUSTOMER });
});

afterAll(async () => {
  await prisma.setting.deleteMany({ where: { key: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function req(
  url: string,
  options: { method?: string; body?: unknown; cookie?: string | null } = {},
) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.cookie !== undefined) {
    if (options.cookie !== null) headers.cookie = `${getCookieName()}=${options.cookie}`;
  } else {
    headers.cookie = `${getCookieName()}=${adminCookie}`;
  }

  return new NextRequest(`http://localhost${url}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("GET /api/admin/settings", () => {
  it("requires authentication", async () => {
    const response = await GET(req("/api/admin/settings", { cookie: null }));
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await GET(req("/api/admin/settings", { cookie: customerCookie }));
    expect(response.status).toBe(403);
  });

  it("returns settings as a key/value object", async () => {
    await PATCH(
      req("/api/admin/settings", {
        method: "PATCH",
        body: { [`${PREFIX}StoreName`]: "Technotopia" },
      }),
    );

    const response = await GET(req("/api/admin/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[`${PREFIX}StoreName`]).toBe("Technotopia");
  });
});

describe("PATCH /api/admin/settings", () => {
  it("requires authentication", async () => {
    const response = await PATCH(
      req("/api/admin/settings", {
        method: "PATCH",
        body: { [`${PREFIX}Key`]: "value" },
        cookie: null,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await PATCH(
      req("/api/admin/settings", {
        method: "PATCH",
        body: { [`${PREFIX}Key`]: "value" },
        cookie: customerCookie,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("upserts a partial key/value update", async () => {
    const response = await PATCH(
      req("/api/admin/settings", {
        method: "PATCH",
        body: { [`${PREFIX}SupportEmail`]: "support@technotopia.test" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data[`${PREFIX}SupportEmail`]).toBe("support@technotopia.test");
  });

  it("updates an existing key instead of duplicating it", async () => {
    await PATCH(
      req("/api/admin/settings", {
        method: "PATCH",
        body: { [`${PREFIX}Phone`]: "+1 000" },
      }),
    );
    const response = await PATCH(
      req("/api/admin/settings", {
        method: "PATCH",
        body: { [`${PREFIX}Phone`]: "+1 111" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[`${PREFIX}Phone`]).toBe("+1 111");

    const rows = await prisma.setting.findMany({ where: { key: `${PREFIX}Phone` } });
    expect(rows).toHaveLength(1);
  });

  it("rejects an empty body with a 400", async () => {
    const response = await PATCH(req("/api/admin/settings", { method: "PATCH", body: {} }));
    expect(response.status).toBe(400);
  });
});
