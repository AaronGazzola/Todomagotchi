import { invitation, organization, user } from "@prisma/client";

export type SendInvitationsParams = {
  emails: string[];
  role: "member" | "admin";
  organizationId: string;
};

export type PendingInvitation = invitation & {
  organization: organization;
  inviter: user;
};

export type InvitationResult = {
  success: boolean;
  invitationId?: string;
  email: string;
  error?: string;
};
