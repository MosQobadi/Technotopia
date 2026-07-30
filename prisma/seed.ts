import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";

const adapter = new PrismaPg(process.env["DATABASE_URL"] as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@technotopia.com" },
    update: {},
    create: {
      email: "admin@technotopia.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    },
  });

  const [cameras, microphones, lights] = await Promise.all([
    prisma.category.upsert({
      where: { slug: "cameras" },
      update: {},
      create: {
        name: "Cameras",
        slug: "cameras",
        tags: ["photography", "video", "mirrorless"],
        shortDescription: "Mirrorless and DSLR cameras for every skill level.",
        longDescription:
          "A curated range of mirrorless and DSLR cameras, from entry-level bodies to professional workhorses, built for photographers and videographers alike.",
        status: "ACTIVE",
      },
    }),
    prisma.category.upsert({
      where: { slug: "microphones" },
      update: {},
      create: {
        name: "Microphones",
        slug: "microphones",
        tags: ["audio", "recording", "streaming"],
        shortDescription: "Studio and field microphones for clear audio capture.",
        longDescription:
          "Condenser, shotgun, and lavalier microphones designed for studio recording, on-location shoots, and live streaming setups.",
        status: "ACTIVE",
      },
    }),
    prisma.category.upsert({
      where: { slug: "lights" },
      update: {},
      create: {
        name: "Lights",
        slug: "lights",
        tags: ["lighting", "studio", "video"],
        shortDescription: "LED panels and studio lighting kits.",
        longDescription:
          "Continuous LED panels, ring lights, and studio lighting kits for photo and video production, indoors or on location.",
        status: "ACTIVE",
      },
    }),
  ]);

  const [sony, boya, canon, roads] = await Promise.all([
    prisma.brand.upsert({
      where: { slug: "sony" },
      update: {},
      create: { name: "Sony", slug: "sony", status: "ACTIVE" },
    }),
    prisma.brand.upsert({
      where: { slug: "boya" },
      update: {},
      create: { name: "Boya", slug: "boya", status: "ACTIVE" },
    }),
    prisma.brand.upsert({
      where: { slug: "canon" },
      update: {},
      create: { name: "Canon", slug: "canon", status: "ACTIVE" },
    }),
    prisma.brand.upsert({
      where: { slug: "roads" },
      update: {},
      create: { name: "Roads", slug: "roads", status: "ACTIVE" },
    }),
  ]);

  const productSeeds: {
    name: string;
    sku: string;
    categoryId: string;
    brandId: string;
    price: number;
    discountPercent: number;
    tags: string[];
    shortDescription: string;
    longDescription: string;
    status: Prisma.ProductCreateInput["status"];
    stock: number;
  }[] = [
    {
      name: "Sony Alpha 7 IV",
      sku: "SNY-A7IV",
      categoryId: cameras.id,
      brandId: sony.id,
      price: 2499,
      discountPercent: 10,
      tags: ["mirrorless", "full-frame"],
      shortDescription: "Full-frame mirrorless camera with 33MP sensor.",
      longDescription:
        "The Sony Alpha 7 IV pairs a 33MP full-frame sensor with fast hybrid autofocus, making it a versatile choice for photographers and hybrid shooters.",
      status: "ACTIVE",
      stock: 25,
    },
    {
      name: "Sony ZV-E10",
      sku: "SNY-ZVE10",
      categoryId: cameras.id,
      brandId: sony.id,
      price: 799,
      discountPercent: 0,
      tags: ["mirrorless", "vlogging"],
      shortDescription: "Compact vlogging camera with interchangeable lenses.",
      longDescription:
        "A lightweight APS-C mirrorless camera built for vloggers, with a flip-out screen, background defocus button, and strong built-in mic.",
      status: "ACTIVE",
      stock: 6,
    },
    {
      name: "Canon EOS R6 Mark II",
      sku: "CAN-EOSR6M2",
      categoryId: cameras.id,
      brandId: canon.id,
      price: 2299,
      discountPercent: 5,
      tags: ["mirrorless", "full-frame", "hybrid"],
      shortDescription: "High-speed full-frame hybrid mirrorless camera.",
      longDescription:
        "The EOS R6 Mark II delivers 40fps burst shooting and 4K60 video, making it equally capable for sports, wildlife, and video production.",
      status: "ACTIVE",
      stock: 14,
    },
    {
      name: "Canon EOS 90D",
      sku: "CAN-EOS90D",
      categoryId: cameras.id,
      brandId: canon.id,
      price: 1199,
      discountPercent: 0,
      tags: ["dslr", "aps-c"],
      shortDescription: "APS-C DSLR with 32.5MP sensor and fast burst shooting.",
      longDescription:
        "A versatile APS-C DSLR offering a 32.5MP sensor, 10fps continuous shooting, and 4K video, suited to enthusiasts moving up from entry-level bodies.",
      status: "ACTIVE",
      stock: 0,
    },
    {
      name: "Boya BY-M1 Lavalier Mic",
      sku: "BOYA-BYM1",
      categoryId: microphones.id,
      brandId: boya.id,
      price: 20,
      discountPercent: 0,
      tags: ["lavalier", "budget"],
      shortDescription: "Affordable omnidirectional lavalier microphone.",
      longDescription:
        "A budget-friendly clip-on lavalier microphone with a 6m cable, compatible with cameras, smartphones, and recorders.",
      status: "ACTIVE",
      stock: 120,
    },
    {
      name: "Boya BY-MM1 Shotgun Mic",
      sku: "BOYA-BYMM1",
      categoryId: microphones.id,
      brandId: boya.id,
      price: 50,
      discountPercent: 15,
      tags: ["shotgun", "camera-mount"],
      shortDescription: "Compact shotgun mic for cameras and smartphones.",
      longDescription:
        "A cardioid shotgun microphone designed for DSLR and mirrorless cameras, with a shock mount and dual-output cables for camera or phone use.",
      status: "ACTIVE",
      stock: 8,
    },
    {
      name: "Roads Ring Light 18\"",
      sku: "RDS-RING18",
      categoryId: lights.id,
      brandId: roads.id,
      price: 129,
      discountPercent: 20,
      tags: ["ring-light", "streaming"],
      shortDescription: "18-inch bi-color LED ring light with stand.",
      longDescription:
        "An 18-inch bi-color LED ring light with adjustable brightness and color temperature, including a tripod stand and phone holder.",
      status: "ACTIVE",
      stock: 40,
    },
    {
      name: "Roads LED Panel Kit",
      sku: "RDS-LEDPANEL",
      categoryId: lights.id,
      brandId: roads.id,
      price: 249,
      discountPercent: 0,
      tags: ["led-panel", "studio-kit"],
      shortDescription: "Dual LED panel lighting kit with stands and bags.",
      longDescription:
        "A two-panel bi-color LED lighting kit with adjustable stands and carrying bags, suited to small studio and interview setups.",
      status: "ACTIVE",
      stock: 3,
    },
  ];

  const products = [];
  for (const seed of productSeeds) {
    const { stock, ...productData } = seed;
    const product = await prisma.product.upsert({
      where: { sku: seed.sku },
      update: {},
      create: productData,
    });
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        stock,
        lastUpdatedAt: new Date(),
      },
    });
    products.push(product);
  }

  const customerSeeds = [
    { email: "amelia.jones@example.com", firstName: "Amelia", lastName: "Jones" },
    { email: "noah.smith@example.com", firstName: "Noah", lastName: "Smith" },
    { email: "olivia.brown@example.com", firstName: "Olivia", lastName: "Brown" },
    { email: "liam.davis@example.com", firstName: "Liam", lastName: "Davis" },
    { email: "emma.wilson@example.com", firstName: "Emma", lastName: "Wilson" },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    const customer = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        passwordHash,
        firstName: seed.firstName,
        lastName: seed.lastName,
        role: "CUSTOMER",
      },
    });
    customers.push(customer);
  }

  type LineSeed = { product: (typeof products)[number]; quantity: number };

  function computeTotals(lines: LineSeed[], shippingCost: number, taxRate: number) {
    const items = lines.map((line) => {
      const price = line.product.price;
      const discountPercent = line.product.discountPercent;
      const discountedPrice = price * (1 - discountPercent / 100);
      const lineTotal = Math.round(discountedPrice * line.quantity);
      return { line, price, lineTotal };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.line.quantity, 0);
    const discountedSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = subtotal - discountedSubtotal;
    const tax = Math.round(discountedSubtotal * taxRate);
    const total = discountedSubtotal + shippingCost + tax;
    return { items, subtotal, discount, tax, total };
  }

  const orderSeeds: {
    customer: (typeof customers)[number];
    status: "PENDING" | "SENDING" | "DELIVERED" | "CANCELLED";
    paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
    shippingAddress: string;
    postalCode: string;
    shippingCost: number;
    lines: LineSeed[];
  }[] = [
    {
      customer: customers[0]!,
      status: "PENDING",
      paymentStatus: "UNPAID",
      shippingAddress: "12 Baker Street, London",
      postalCode: "NW1 6XE",
      shippingCost: 10,
      lines: [
        { product: products[0]!, quantity: 1 },
        { product: products[4]!, quantity: 2 },
      ],
    },
    {
      customer: customers[1]!,
      status: "SENDING",
      paymentStatus: "PAID",
      shippingAddress: "45 Elm Avenue, Manchester",
      postalCode: "M1 4BT",
      shippingCost: 15,
      lines: [{ product: products[2]!, quantity: 1 }],
    },
    {
      customer: customers[2]!,
      status: "DELIVERED",
      paymentStatus: "PAID",
      shippingAddress: "8 Maple Road, Bristol",
      postalCode: "BS1 5TR",
      shippingCost: 5,
      lines: [
        { product: products[5]!, quantity: 3 },
        { product: products[6]!, quantity: 1 },
        { product: products[4]!, quantity: 1 },
      ],
    },
    {
      customer: customers[3]!,
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
      shippingAddress: "3 Oak Close, Leeds",
      postalCode: "LS1 2AB",
      shippingCost: 10,
      lines: [{ product: products[1]!, quantity: 1 }],
    },
    {
      customer: customers[4]!,
      status: "DELIVERED",
      paymentStatus: "PAID",
      shippingAddress: "27 Birch Lane, Edinburgh",
      postalCode: "EH1 1AA",
      shippingCost: 12,
      lines: [
        { product: products[7]!, quantity: 1 },
        { product: products[0]!, quantity: 1 },
      ],
    },
  ];

  for (const seed of orderSeeds) {
    const { items, subtotal, discount, tax, total } = computeTotals(
      seed.lines,
      seed.shippingCost,
      0.08,
    );

    await prisma.order.create({
      data: {
        customerId: seed.customer.id,
        status: seed.status,
        paymentStatus: seed.paymentStatus,
        subtotal,
        discount,
        shippingCost: seed.shippingCost,
        tax,
        total,
        shippingAddress: seed.shippingAddress,
        postalCode: seed.postalCode,
        items: {
          create: items.map(({ line, price, lineTotal }) => ({
            productId: line.product.id,
            productNameSnapshot: line.product.name,
            priceSnapshot: price,
            quantity: line.quantity,
            lineTotal,
          })),
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Categories: ${[cameras, microphones, lights].length}`);
  console.log(`  Brands: ${[sony, boya, canon, roads].length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Orders: ${orderSeeds.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
