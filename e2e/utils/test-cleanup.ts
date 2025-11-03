import { PrismaClient } from "@prisma/client";
import { ENV } from "../../lib/env.utils";

const prisma = new PrismaClient({
  datasourceUrl: ENV.DATABASE_URL,
});

export async function cleanupTestData(userEmails: string[]): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { in: userEmails } },
  });

  const userIds = users.map((u) => u.id);

  const memberRecords = await prisma.member.findMany({
    where: { userId: { in: userIds } },
  });

  const orgIds = memberRecords.map((m) => m.organizationId);

  await prisma.todo.deleteMany({
    where: { organizationId: { in: orgIds } },
  });

  await prisma.invitation.deleteMany({
    where: {
      OR: [
        { email: { in: userEmails } },
        { inviterId: { in: userIds } },
      ],
    },
  });
}

export async function resetTamagotchiState(
  organizationId: string
): Promise<void> {
  await prisma.tamagotchi.update({
    where: { organizationId },
    data: {
      hunger: 7,
      happiness: 100,
      wasteCount: 0,
      age: 0,
      feedCount: 0,
      lastFedAt: new Date(),
      lastCleanedAt: new Date(),
      lastCheckedAt: new Date(),
    },
  });
}

export async function cleanupUserGeneratedContent(
  userEmails: string[]
): Promise<void> {
  await cleanupTestData(userEmails);
}
