import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAddresses, POST as createAddress } from "./route";
import { PATCH as updateAddress, DELETE as deleteAddress } from "./[addressId]/route";
import { getCookieName, signToken } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db";

const PREFIX = "task24-2-addresses";

let customerACookie: string;
let customerBCookie: string;
let addressId: string;

const VALID_ADDRESS = {
  fullName: "Customer A",
  phone: "+98 910 000 00 00",
  addressLine: "12 Test Street",
  city: "Tehran",
  postalCode: "12345",
};

beforeAll(async () => {
  const customerA = await prisma.user.create({
    data: {
      email: `${PREFIX}-a@technotopia.test`,
      passwordHash: "x",
      firstName: "Customer",
      lastName: "A",
      role: Role.CUSTOMER,
    },
  });
  customerACookie = await signToken({ userId: customerA.id, role: Role.CUSTOMER });

  const customerB = await prisma.user.create({
    data: {
      email: `${PREFIX}-b@technotopia.test`,
      passwordHash: "x",
      firstName: "Customer",
      lastName: "B",
      role: Role.CUSTOMER,
    },
  });
  customerBCookie = await signToken({ userId: customerB.id, role: Role.CUSTOMER });

  const address = await prisma.address.create({ data: { ...VALID_ADDRESS, userId: customerA.id } });
  addressId = address.id;
});

afterAll(async () => {
  await prisma.address.deleteMany({ where: { user: { email: { startsWith: PREFIX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

function req(url: string, method: string, body: unknown, cookie: string | null) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie !== null) headers.cookie = `${getCookieName()}=${cookie}`;
  return new NextRequest(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("GET /api/storefront/account/addresses", () => {
  it("rejects an unauthenticated request with a 401", async () => {
    const response = await getAddresses(
      req("http://localhost/api/storefront/account/addresses", "GET", undefined, null),
    );
    expect(response.status).toBe(401);
  });

  it("only returns the requesting customer's own addresses", async () => {
    const response = await getAddresses(
      req("http://localhost/api/storefront/account/addresses", "GET", undefined, customerBCookie),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([]); // customer B has none
  });
});

describe("POST /api/storefront/account/addresses", () => {
  it("rejects a body missing required fields with a 400", async () => {
    const response = await createAddress(
      req("http://localhost/api/storefront/account/addresses", "POST", {}, customerACookie),
    );
    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/storefront/account/addresses/[addressId]", () => {
  it("rejects an unauthenticated request with a 401", async () => {
    const response = await updateAddress(
      req(`http://localhost/api/storefront/account/addresses/${addressId}`, "PATCH", { city: "X" }, null),
      { params: Promise.resolve({ addressId }) },
    );
    expect(response.status).toBe(401);
  });

  it("can't be used by another customer to modify someone else's address", async () => {
    const response = await updateAddress(
      req(
        `http://localhost/api/storefront/account/addresses/${addressId}`,
        "PATCH",
        { city: "Hijacked" },
        customerBCookie,
      ),
      { params: Promise.resolve({ addressId }) },
    );
    expect(response.status).toBe(404);

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    expect(address?.city).toBe(VALID_ADDRESS.city); // unchanged
  });

  it("lets the owning customer update their own address", async () => {
    const response = await updateAddress(
      req(
        `http://localhost/api/storefront/account/addresses/${addressId}`,
        "PATCH",
        { city: "Shiraz" },
        customerACookie,
      ),
      { params: Promise.resolve({ addressId }) },
    );
    expect(response.status).toBe(200);

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    expect(address?.city).toBe("Shiraz");
  });
});

describe("DELETE /api/storefront/account/addresses/[addressId]", () => {
  it("can't be used by another customer to delete someone else's address", async () => {
    const response = await deleteAddress(
      req(`http://localhost/api/storefront/account/addresses/${addressId}`, "DELETE", undefined, customerBCookie),
      { params: Promise.resolve({ addressId }) },
    );
    expect(response.status).toBe(404);

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    expect(address).not.toBeNull();
  });

  it("lets the owning customer delete their own address", async () => {
    const response = await deleteAddress(
      req(`http://localhost/api/storefront/account/addresses/${addressId}`, "DELETE", undefined, customerACookie),
      { params: Promise.resolve({ addressId }) },
    );
    expect(response.status).toBe(200);

    const address = await prisma.address.findUnique({ where: { id: addressId } });
    expect(address).toBeNull();
  });
});
