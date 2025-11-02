import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization } from "better-auth/plugins";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    admin(),
    organization({
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user }) => {
          try {
            const randomSpecies = `species${Math.floor(Math.random() * 10)}`;

            await prisma.organization.update({
              where: { id: organization.id },
              data: { createdBy: user.id },
            });

            await prisma.member.update({
              where: {
                userId_organizationId: {
                  userId: user.id,
                  organizationId: organization.id,
                },
              },
              data: { role: "owner" },
            });

            await prisma.tamagotchi.create({
              data: {
                organizationId: organization.id,
                species: randomSpecies,
              },
            });
          } catch (error) {
            console.error("Error creating Tamagotchi:", error);
          }
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
