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
          await prisma.member.update({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: organization.id,
              },
            },
            data: { role: "owner" },
          });
        },
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
