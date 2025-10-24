import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const testUser = await prisma.user.upsert({
    where: { id: "test-user-id" },
    update: {},
    create: {
      id: "test-user-id",
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: true,
    },
  });

  const org1 = await prisma.organization.upsert({
    where: { id: "test-org-1" },
    update: {},
    create: {
      id: "test-org-1",
      name: "Personal Tasks",
      slug: "demo-org-1",
    },
  });

  const org2 = await prisma.organization.upsert({
    where: { id: "test-org-2" },
    update: {},
    create: {
      id: "test-org-2",
      name: "Work Projects",
      slug: "demo-org-2",
    },
  });

  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: testUser.id,
        organizationId: org1.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: org1.id,
      role: "owner",
    },
  });

  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: testUser.id,
        organizationId: org2.id,
      },
    },
    update: {},
    create: {
      userId: testUser.id,
      organizationId: org2.id,
      role: "admin",
    },
  });

  await prisma.tamagotchi.update({
    where: { organizationId: org1.id },
    data: {
      hunger: 40,
      happiness: 80,
      wasteCount: 1,
      color: "#3b82f6",
      species: "species3",
      age: 2,
      feedCount: 25,
      lastFedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastCleanedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.tamagotchi.update({
    where: { organizationId: org2.id },
    data: {
      hunger: 7,
      happiness: 90,
      wasteCount: 0,
      color: "#10b981",
      species: "species7",
      age: 0,
      feedCount: 5,
      lastFedAt: new Date(),
      lastCleanedAt: new Date(),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.todo.deleteMany({
    where: {
      organizationId: { in: [org1.id, org2.id] },
    },
  });

  await prisma.todo.createMany({
    data: [
      {
        organizationId: org1.id,
        text: "Buy groceries",
        completed: false,
      },
      {
        organizationId: org1.id,
        text: "Call dentist",
        completed: true,
      },
      {
        organizationId: org2.id,
        text: "Review pull request",
        completed: false,
      },
      {
        organizationId: org2.id,
        text: "Update documentation",
        completed: false,
      },
    ],
  });

  console.log("Seeding complete!");
  console.log("\nDemo Account:");
  console.log("Email: demo@example.com");
  console.log("Password: (set during sign-up)");
  console.log("\nOrganizations:");
  console.log("1. Personal Tasks - species3, age 2 (child), 25 feeds, blue tamagotchi");
  console.log("2. Work Projects - species7, age 0 (egg), 5 feeds, green tamagotchi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
