import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const testUserId = "test-user-id";

  console.log("Seeding database...");

  await prisma.tamagotchi.upsert({
    where: { userId: testUserId },
    update: {},
    create: {
      userId: testUserId,
      hunger: 40,
      happiness: 80,
      wasteCount: 1,
      lastFedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastCleanedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      lastCheckedAt: new Date(),
    },
  });

  await prisma.todo.createMany({
    data: [
      {
        userId: testUserId,
        text: "Complete project setup",
        completed: false,
      },
      {
        userId: testUserId,
        text: "Write documentation",
        completed: false,
      },
      {
        userId: testUserId,
        text: "Review pull requests",
        completed: true,
      },
      {
        userId: testUserId,
        text: "Deploy to production",
        completed: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
