import { PrismaClient } from "@prisma/client";
import { render } from "@react-email/components";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, magicLink, organization } from "better-auth/plugins";
import { Resend } from "resend";
import { MagicLinkEmail } from "./emails/MagicLinkEmail";
import { InvitationMagicLinkEmail } from "./emails/InvitationMagicLinkEmail";
import { OrganizationInvitationEmail } from "./emails/OrganizationInvitationEmail";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const callbackUrl = urlParams.get("callbackURL") || "";
        const invitationParam = new URLSearchParams(
          callbackUrl.split("?")[1]
        )?.get("invitation");

        let isInvitation = false;
        let invitationData = null;

        if (invitationParam) {
          try {
            invitationData = JSON.parse(decodeURIComponent(invitationParam));
            isInvitation = true;
          } catch {}
        }

        if (isInvitation && invitationData) {
          const html = await render(
            InvitationMagicLinkEmail({
              url,
              organizationName: invitationData.organizationName,
              inviterName: invitationData.inviterName,
              role: invitationData.role,
            })
          );

          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: email,
            subject: `You've been invited to join ${invitationData.organizationName}`,
            html,
          });
        } else {
          const html = await render(MagicLinkEmail({ url }));

          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: email,
            subject: "Sign in to your account",
            html,
          });
        }
      },
      expiresIn: 300,
      disableSignUp: false,
    }),
    admin(),
    organization({
      sendInvitationEmail: async (data) => {
        const { email, organization, inviter, invitation } = data;
        const invitationId = invitation.id;
        const invitationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/accept-invitation?invitationId=${invitationId}`;

        const html = await render(
          OrganizationInvitationEmail({
            organizationName: organization.name,
            inviterName: inviter.user.name || inviter.user.email,
            invitationUrl,
          })
        );

        await resend.emails.send({
          from: process.env.FROM_EMAIL || "noreply@example.com",
          to: email,
          subject: `You've been invited to join ${organization.name}`,
          html,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
