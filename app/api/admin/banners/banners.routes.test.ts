import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET as getOne, PATCH } from "./[id]/route";
import { GET as list, POST as create } from "./route";
import { PATCH as reorder } from "./reorder/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role, Status } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task12b1";
const adminId = "task12b1-admin-id";

let adminCookie: string;
let customerCookie: string;

beforeAll(async () => {
  adminCookie = await signToken({ userId: adminId, role: Role.ADMIN });
  customerCookie = await signToken({ userId: "task12b1-customer-id", role: Role.CUSTOMER });
});

afterAll(async () => {
  await prisma.banner.deleteMany({ where: { headline: { startsWith: PREFIX } } });
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

function validBannerBody(overrides: Record<string, unknown> = {}) {
  return {
    image: "/uploads/banner.jpg",
    headline: `${PREFIX} Summer Sale`,
    subheadline: "Up to 50% off",
    link: "/categories/summer",
    displayOrder: 0,
    status: Status.ACTIVE,
    ...overrides,
  };
}

async function createBannerDirect(overrides: Record<string, unknown> = {}) {
  const response = await create(
    req("/api/admin/banners", { method: "POST", body: validBannerBody(overrides) }),
  );
  const body = await response.json();
  return { response, body };
}

describe("POST /api/admin/banners", () => {
  it("requires authentication", async () => {
    const response = await create(
      req("/api/admin/banners", { method: "POST", body: validBannerBody(), cookie: null }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    const response = await create(
      req("/api/admin/banners", {
        method: "POST",
        body: validBannerBody(),
        cookie: customerCookie,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("creates a banner", async () => {
    const { response, body } = await createBannerDirect({ headline: `${PREFIX} Create Me` });

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.headline).toBe(`${PREFIX} Create Me`);
    expect(body.data.status).toBe(Status.ACTIVE);
  });

  it("rejects a missing image with a 400", async () => {
    const response = await create(
      req("/api/admin/banners", {
        method: "POST",
        body: validBannerBody({ image: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects an external image URL with a 400", async () => {
    const response = await create(
      req("/api/admin/banners", {
        method: "POST",
        body: validBannerBody({ image: "https://picsum.photos/seed/x/1200/400" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a missing headline with a 400", async () => {
    const response = await create(
      req("/api/admin/banners", {
        method: "POST",
        body: validBannerBody({ headline: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("allows creating without a link", async () => {
    const { response, body } = await createBannerDirect({
      headline: `${PREFIX} No Link`,
      link: undefined,
    });

    expect(response.status).toBe(201);
    expect(body.data.link).toBeNull();
  });
});

describe("GET /api/admin/banners", () => {
  it("lists banners ordered by displayOrder, filtered by status", async () => {
    await createBannerDirect({
      headline: `${PREFIX} Inactive Banner`,
      status: Status.INACTIVE,
      displayOrder: 5,
    });

    const response = await list(
      req(`/api/admin/banners?status=INACTIVE&page=1&pageSize=50`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(
      body.data.banners.every((b: { status: string }) => b.status === "INACTIVE"),
    ).toBe(true);
  });

  it("requires authentication", async () => {
    const response = await list(req("/api/admin/banners", { cookie: null }));
    expect(response.status).toBe(401);
  });
});

describe("GET /api/admin/banners/:id", () => {
  it("returns a single banner", async () => {
    const { body: created } = await createBannerDirect({ headline: `${PREFIX} Get Me` });

    const response = await getOne(req(`/api/admin/banners/${created.data.id}`), {
      params: Promise.resolve({ id: created.data.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(created.data.id);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await getOne(req("/api/admin/banners/does-not-exist"), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/banners/:id", () => {
  it("updates a banner", async () => {
    const { body: created } = await createBannerDirect({ headline: `${PREFIX} Patch Me` });

    const response = await PATCH(
      req(`/api/admin/banners/${created.data.id}`, {
        method: "PATCH",
        body: { status: Status.INACTIVE },
      }),
      { params: Promise.resolve({ id: created.data.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe(Status.INACTIVE);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await PATCH(
      req("/api/admin/banners/does-not-exist", {
        method: "PATCH",
        body: { status: Status.ACTIVE },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/admin/banners/:id", () => {
  it("deletes a banner", async () => {
    const { body: created } = await createBannerDirect({ headline: `${PREFIX} Delete Me` });

    const response = await DELETE(req(`/api/admin/banners/${created.data.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: created.data.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: null });

    const stillExists = await prisma.banner.findUnique({ where: { id: created.data.id } });
    expect(stillExists).toBeNull();
  });

  it("returns 404 for an unknown id", async () => {
    const response = await DELETE(req("/api/admin/banners/does-not-exist", { method: "DELETE" }), {
      params: Promise.resolve({ id: "does-not-exist" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/banners/reorder", () => {
  it("requires authentication", async () => {
    const response = await reorder(
      req("/api/admin/banners/reorder", {
        method: "PATCH",
        body: [{ id: "x", displayOrder: 0 }],
        cookie: null,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects an empty array with a 400", async () => {
    const response = await reorder(
      req("/api/admin/banners/reorder", { method: "PATCH", body: [] }),
    );
    expect(response.status).toBe(400);
  });

  it("updates displayOrder for each banner in the array", async () => {
    const { body: first } = await createBannerDirect({
      headline: `${PREFIX} Reorder A`,
      displayOrder: 0,
    });
    const { body: second } = await createBannerDirect({
      headline: `${PREFIX} Reorder B`,
      displayOrder: 1,
    });

    const response = await reorder(
      req("/api/admin/banners/reorder", {
        method: "PATCH",
        body: [
          { id: first.data.id, displayOrder: 1 },
          { id: second.data.id, displayOrder: 0 },
        ],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: null });

    const reorderedFirst = await prisma.banner.findUnique({ where: { id: first.data.id } });
    const reorderedSecond = await prisma.banner.findUnique({ where: { id: second.data.id } });
    expect(reorderedFirst?.displayOrder).toBe(1);
    expect(reorderedSecond?.displayOrder).toBe(0);
  });

  it("returns 404 when a banner id doesn't exist", async () => {
    const response = await reorder(
      req("/api/admin/banners/reorder", {
        method: "PATCH",
        body: [{ id: "does-not-exist", displayOrder: 0 }],
      }),
    );
    expect(response.status).toBe(404);
  });
});
