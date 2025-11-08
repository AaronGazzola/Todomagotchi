import { PrismaClient } from "@prisma/client";
import { ENV } from "@/lib/env.utils";

const prisma = new PrismaClient({
  datasourceUrl: ENV.DATABASE_URL,
});

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

export async function cleanupAuthTestUsers(): Promise<void> {
  const testEmailPattern = TEST_EMAIL.split('@')[0];

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: testEmailPattern } },
        { email: { contains: '+' } },
      ],
    },
    include: {
      member: {
        include: {
          organization: true,
        },
      },
    },
  });

  const userIds = testUsers.map(u => u.id);
  const memberRecords = testUsers.flatMap(u => u.member);
  const orgIds = memberRecords.map(m => m.organizationId);

  if (orgIds.length > 0) {
    await prisma.todo.deleteMany({
      where: { organizationId: { in: orgIds } },
    });

    await prisma.tamagotchi.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
  }

  await prisma.invitation.deleteMany({
    where: {
      OR: [
        { email: { contains: testEmailPattern } },
        { email: { contains: '+' } },
        { inviterId: { in: userIds } },
      ],
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });

  await prisma.account.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });

  await prisma.member.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });

  if (orgIds.length > 0) {
    await prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });
  }

  await prisma.user.deleteMany({
    where: {
      id: { in: userIds },
    },
  });
}
