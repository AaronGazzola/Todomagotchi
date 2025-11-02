"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";
import {
  InvitationResult,
  PendingInvitation,
  SendInvitationsParams,
} from "./AvatarMenu.types";

export const getUserOrganizationsAction = async (): Promise<
  ActionResponse<unknown>
> => {
  try {
    const organizations = await auth.api.listOrganizations({
      headers: await headers(),
    });

    return getActionResponse({ data: organizations });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const setActiveOrganizationAction = async (
  organizationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    await auth.api.setActiveOrganization({
      body: { organizationId },
      headers: await headers(),
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const createOrganizationAction = async (
  name: string,
  slug: string
): Promise<ActionResponse<unknown>> => {
  try {
    const result = await auth.api.createOrganization({
      body: { name, slug },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to create organization");
    }

    return getActionResponse({ data: result });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getOrganizationTamagotchiColorAction = async (
  organizationId: string
): Promise<ActionResponse<string>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const { db } = await getAuthenticatedClient();

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId },
      select: { color: true },
    });

    return getActionResponse({ data: tamagotchi?.color || "#1f2937" });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateTamagotchiColorAction = async (
  color: string
): Promise<ActionResponse<void>> => {
  try {
    const { db } = await getAuthenticatedClient();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: { color },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const resetOrganizationDataAction = async (): Promise<
  ActionResponse<void>
> => {
  try {
    const { db } = await getAuthenticatedClient();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
      select: { color: true },
    });

    const currentColor = tamagotchi?.color || "#1f2937";
    const randomSpecies = `species${Math.floor(Math.random() * 10)}`;

    await db.todo.deleteMany({});

    await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: {
        hunger: 7,
        happiness: 100,
        wasteCount: 0,
        color: currentColor,
        species: randomSpecies,
        age: 0,
        feedCount: 0,
        lastFedAt: new Date(),
        lastCleanedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const sendInvitationsAction = async (
  params: SendInvitationsParams
): Promise<ActionResponse<InvitationResult[]>> => {
  try {
    const { db, session: authSession } = await getAuthenticatedClient();

    if (!authSession?.user?.id) {
      throw new Error("Unauthorized");
    }

    const { emails, role, organizationId } = params;

    if (!emails || emails.length === 0) {
      throw new Error("At least one email is required");
    }

    const member = await db.member.findUnique({
      where: {
        userId_organizationId: {
          userId: authSession.user.id,
          organizationId,
        },
      },
    });

    if (!member || member.role !== "admin") {
      throw new Error("Only organization admins can send invitations");
    }

    const results: InvitationResult[] = [];

    for (const email of emails) {
      try {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          results.push({
            success: false,
            email: trimmedEmail,
            error: "Invalid email format",
          });
          continue;
        }

        const existingInvitation = await db.invitation.findUnique({
          where: {
            email_organizationId: {
              email: trimmedEmail,
              organizationId,
            },
          },
        });

        if (existingInvitation && existingInvitation.status === "pending") {
          results.push({
            success: false,
            email: trimmedEmail,
            error: "Invitation already sent",
          });
          continue;
        }

        const existingMember = await db.member.findFirst({
          where: {
            organizationId,
            user: {
              email: trimmedEmail,
            },
          },
        });

        if (existingMember) {
          results.push({
            success: false,
            email: trimmedEmail,
            error: "User is already a member",
          });
          continue;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = await db.invitation.create({
          data: {
            email: trimmedEmail,
            organizationId,
            inviterId: authSession.user.id,
            role,
            status: "pending",
            expiresAt,
          },
        });

        results.push({
          success: true,
          email: trimmedEmail,
          invitationId: invitation.id,
        });
      } catch (error) {
        results.push({
          success: false,
          email: email.trim(),
          error: error instanceof Error ? error.message : "Failed to send invitation",
        });
      }
    }

    return getActionResponse({ data: results });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getPendingInvitationsForUserAction = async (): Promise<
  ActionResponse<PendingInvitation[]>
> => {
  try {
    const { db, session: authSession } = await getAuthenticatedClient();

    if (!authSession?.user?.email) {
      throw new Error("Unauthorized");
    }

    const invitations = await db.invitation.findMany({
      where: {
        email: authSession.user.email,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: true,
        inviter: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return getActionResponse({ data: invitations });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const acceptInvitationAction = async (
  invitationId: string
): Promise<ActionResponse<void>> => {
  try {
    const result = await auth.api.acceptInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to accept invitation");
    }

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const declineInvitationAction = async (
  invitationId: string
): Promise<ActionResponse<void>> => {
  try {
    const { db } = await getAuthenticatedClient();

    await db.invitation.update({
      where: { id: invitationId },
      data: { status: "rejected" },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
