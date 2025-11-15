import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

const E2E_TEST_PASSWORD = "E2ETestPass123!";
const INVITER_PASSWORD = "InviterPass123!";
const INVITEE_PASSWORD = "InviteePass123!";

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

  let e2eTestUser = await prisma.user.findUnique({
    where: { email: "e2e-test@example.com" },
  });

  if (!e2eTestUser) {
    await auth.api.signUpEmail({
      body: {
        email: "e2e-test@example.com",
        password: E2E_TEST_PASSWORD,
        name: "E2E Test User",
      },
    });
    e2eTestUser = await prisma.user.findUnique({
      where: { email: "e2e-test@example.com" },
    });
    if (!e2eTestUser) {
      throw new Error("Failed to create e2e test user");
    }
  }

  let inviterUser = await prisma.user.findUnique({
    where: { email: "inviter@example.com" },
  });

  if (!inviterUser) {
    await auth.api.signUpEmail({
      body: {
        email: "inviter@example.com",
        password: INVITER_PASSWORD,
        name: "Inviter User",
      },
    });
    inviterUser = await prisma.user.findUnique({
      where: { email: "inviter@example.com" },
    });
    if (!inviterUser) {
      throw new Error("Failed to create inviter user");
    }
  }

  let inviteeUser = await prisma.user.findUnique({
    where: { email: "invitee@example.com" },
  });

  if (!inviteeUser) {
    await auth.api.signUpEmail({
      body: {
        email: "invitee@example.com",
        password: INVITEE_PASSWORD,
        name: "Invitee User",
      },
    });
    inviteeUser = await prisma.user.findUnique({
      where: { email: "invitee@example.com" },
    });
    if (!inviteeUser) {
      throw new Error("Failed to create invitee user");
    }
  }

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

  const e2eOrg = await prisma.organization.upsert({
    where: { id: "e2e-test-org" },
    update: {},
    create: {
      id: "e2e-test-org",
      name: "E2E Test Organization",
      slug: "e2e-test-org",
    },
  });

  const inviterOrg = await prisma.organization.findFirst({
    where: {
      member: {
        some: { userId: inviterUser.id },
      },
    },
  });

  const inviteeOrg = await prisma.organization.findFirst({
    where: {
      member: {
        some: { userId: inviteeUser.id },
      },
    },
  });

  if (!inviterOrg) {
    const newInviterOrg = await prisma.organization.create({
      data: {
        name: "Inviter User Tasks",
        slug: "inviter-user-tasks",
        createdBy: inviterUser.id,
      },
    });

    await prisma.member.create({
      data: {
        userId: inviterUser.id,
        organizationId: newInviterOrg.id,
        role: "owner",
      },
    });

    await prisma.tamagotchi.create({
      data: {
        organizationId: newInviterOrg.id,
        hunger: 30,
        happiness: 70,
        wasteCount: 0,
        color: "#f59e0b",
        species: "species5",
        age: 1,
        feedCount: 10,
        lastFedAt: new Date(),
        lastCleanedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });
  }

  if (!inviteeOrg) {
    const newInviteeOrg = await prisma.organization.create({
      data: {
        name: "Invitee User Tasks",
        slug: "invitee-user-tasks",
        createdBy: inviteeUser.id,
      },
    });

    await prisma.member.create({
      data: {
        userId: inviteeUser.id,
        organizationId: newInviteeOrg.id,
        role: "owner",
      },
    });

    await prisma.tamagotchi.create({
      data: {
        organizationId: newInviteeOrg.id,
        hunger: 20,
        happiness: 85,
        wasteCount: 0,
        color: "#ec4899",
        species: "species2",
        age: 1,
        feedCount: 15,
        lastFedAt: new Date(),
        lastCleanedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });
  }

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

  await prisma.member.upsert({
    where: {
      userId_organizationId: {
        userId: e2eTestUser.id,
        organizationId: e2eOrg.id,
      },
    },
    update: {},
    create: {
      userId: e2eTestUser.id,
      organizationId: e2eOrg.id,
      role: "owner",
    },
  });

  await prisma.tamagotchi.upsert({
    where: { organizationId: org1.id },
    update: {},
    create: {
      organizationId: org1.id,
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

  await prisma.tamagotchi.upsert({
    where: { organizationId: org2.id },
    update: {},
    create: {
      organizationId: org2.id,
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

  await prisma.tamagotchi.upsert({
    where: { organizationId: e2eOrg.id },
    update: {},
    create: {
      organizationId: e2eOrg.id,
      hunger: 50,
      happiness: 50,
      wasteCount: 0,
      color: "#8b5cf6",
      species: "species1",
      age: 0,
      feedCount: 0,
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
  console.log("\nE2E Test Account:");
  console.log("Email: e2e-test@example.com");
  console.log(`Password: ${E2E_TEST_PASSWORD}`);
  console.log("Organization: E2E Test Organization - species1, age 0 (egg), purple tamagotchi");
  console.log("\nInvitation Test Accounts:");
  console.log("Inviter: inviter@example.com");
  console.log(`Password: ${INVITER_PASSWORD}`);
  console.log("Invitee: invitee@example.com");
  console.log(`Password: ${INVITEE_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
