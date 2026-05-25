import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding database...");

  const salt = await bcrypt.genSalt(10);

  const users = await Promise.all([
    db.user.upsert({
      where: { email: "admin@craftxlabs.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@craftxlabs.com",
        password: await bcrypt.hash("Admin@123", salt),
        role: "SUPER_ADMIN",
      },
    }),
    db.user.upsert({
      where: { email: "ceo@craftxlabs.com" },
      update: {},
      create: {
        name: "Alex Johnson",
        email: "ceo@craftxlabs.com",
        password: await bcrypt.hash("Ceo@12345", salt),
        role: "CEO",
      },
    }),
    db.user.upsert({
      where: { email: "cfo@craftxlabs.com" },
      update: {},
      create: {
        name: "Sarah Chen",
        email: "cfo@craftxlabs.com",
        password: await bcrypt.hash("Cfo@12345", salt),
        role: "CFO",
      },
    }),
    db.user.upsert({
      where: { email: "cmo@craftxlabs.com" },
      update: {},
      create: {
        name: "Marcus Williams",
        email: "cmo@craftxlabs.com",
        password: await bcrypt.hash("Cmo@12345", salt),
        role: "CMO",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  await db.client.upsert({
    where: { email: "contact@techcorp.com" },
    update: {},
    create: {
      name: "David Park",
      email: "contact@techcorp.com",
      phone: "+1-415-555-0100",
      company: "TechCorp Solutions",
      industry: "Technology",
      website: "https://techcorp.example.com",
      city: "San Francisco",
      country: "United States",
      status: "ACTIVE",
      notes: "Enterprise client since 2023. High-value account.",
      subscription: {
        create: {
          planName: "Enterprise",
          price: 2500,
          currency: "USD",
          billingCycle: "MONTHLY",
          startDate: new Date("2023-01-01"),
          renewalDate: new Date("2026-01-01"),
          isAutoRenew: true,
          features: ["Unlimited Users", "Priority Support", "Custom Branding", "API Access"],
        },
      },
    },
  });

  await db.client.upsert({
    where: { email: "hello@growthco.io" },
    update: {},
    create: {
      name: "Emma Thompson",
      email: "hello@growthco.io",
      phone: "+44-20-7946-0200",
      company: "GrowthCo Digital",
      industry: "Marketing",
      city: "London",
      country: "United Kingdom",
      status: "TRIAL",
      notes: "30-day trial, potential for professional upgrade.",
      subscription: {
        create: {
          planName: "Professional Trial",
          price: 0,
          currency: "USD",
          billingCycle: "MONTHLY",
          startDate: new Date("2025-05-01"),
          renewalDate: new Date("2025-06-01"),
          isAutoRenew: false,
          features: ["5 Users", "Basic Analytics", "Email Support"],
        },
      },
    },
  });

  const adminUser = users[0];
  const cfoUser = users[2];
  const cmoUser = users[3];

  await db.expense.createMany({
    data: [
      {
        title: "Figma Professional Plan",
        description: "Annual design tool subscription for the team",
        amount: 576,
        currency: "USD",
        category: "SAAS",
        expenseDate: new Date("2025-05-01"),
        status: "APPROVED",
        createdById: adminUser.id,
        approvedById: cfoUser.id,
        approvedAt: new Date("2025-05-02"),
      },
      {
        title: "AWS Infrastructure",
        description: "Monthly cloud hosting and services",
        amount: 1240.5,
        currency: "USD",
        category: "INFRASTRUCTURE",
        expenseDate: new Date("2025-05-05"),
        status: "APPROVED",
        createdById: adminUser.id,
        approvedById: cfoUser.id,
        approvedAt: new Date("2025-05-06"),
      },
      {
        title: "Team Marketing Campaign",
        description: "Q2 social media and paid advertising",
        amount: 3500,
        currency: "USD",
        category: "MARKETING",
        expenseDate: new Date("2025-05-10"),
        status: "PENDING",
        createdById: cmoUser.id,
      },
      {
        title: "GitHub Copilot Seats",
        description: "4 developer seats for AI coding assistant",
        amount: 76,
        currency: "USD",
        category: "SAAS",
        expenseDate: new Date("2025-05-12"),
        status: "PENDING",
        createdById: adminUser.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample expenses");
  console.log("\n✅ Database seeded successfully!");
  console.log("\nLogin credentials:");
  console.log("  Super Admin: admin@craftxlabs.com / Admin@123");
  console.log("  CEO:         ceo@craftxlabs.com  / Ceo@12345");
  console.log("  CFO:         cfo@craftxlabs.com  / Cfo@12345");
  console.log("  CMO:         cmo@craftxlabs.com  / Cmo@12345");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
