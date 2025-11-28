import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";
import { ac, roles } from "./permissions";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const orgName = `${user.name}'s Tasks`;
          const orgSlug = `${user.name.toLowerCase().replace(/\s+/g, "-")}-tasks-${user.id.slice(0, 8)}`;

          await auth.api.createOrganization({
            body: {
              name: orgName,
              slug: orgSlug,
              userId: user.id,
            },
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const member = await prisma.member.findFirst({
            where: { userId: session.userId },
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
          });

          return {
            data: {
              ...session,
              activeOrganizationId: member?.organizationId || null,
            },
          };
        },
      },
    },
  },
  plugins: [
    admin(),
    organization({
      ac,
      roles,
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          try {
            console.log("[afterCreateOrganization] Starting hook", {
              organizationId: organization.id,
              userId: user.id,
            });

            const randomSpecies = `species${Math.floor(Math.random() * 10)}`;
            const colors = [
              "#ef4444",
              "#f97316",
              "#f59e0b",
              "#eab308",
              "#84cc16",
              "#22c55e",
              "#10b981",
              "#14b8a6",
              "#06b6d4",
              "#0ea5e9",
              "#3b82f6",
              "#6366f1",
              "#8b5cf6",
              "#a855f7",
              "#d946ef",
              "#ec4899",
              "#f43f5e",
            ];
            const randomColor =
              colors[Math.floor(Math.random() * colors.length)];

            console.log("[afterCreateOrganization] Updating organization");
            await prisma.organization.update({
              where: { id: organization.id },
              data: { createdBy: user.id },
            });

            console.log("[afterCreateOrganization] Creating tamagotchi");
            await prisma.tamagotchi.create({
              data: {
                organizationId: organization.id,
                species: randomSpecies,
                color: randomColor,
              },
            });

            console.log("[afterCreateOrganization] Updating member role");
            await prisma.member.update({
              where: {
                userId_organizationId: {
                  userId: user.id,
                  organizationId: organization.id,
                },
              },
              data: { role: "owner" },
            });

            console.log(
              "[afterCreateOrganization] Hook completed successfully"
            );
          } catch (error) {
            console.error("[afterCreateOrganization] Error:", error);
            throw error;
          }
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
