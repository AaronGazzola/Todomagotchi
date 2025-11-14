"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { clearAuthCookies } from "@/lib/auth.utils";
import { prisma } from "@/lib/prisma";
import { user, Tamagotchi } from "@prisma/client";
import { headers } from "next/headers";
import { OrganizationWithTamagotchi } from "./layout.types";

export interface UserWithAllData {
  user: user;
  organizations: OrganizationWithTamagotchi[];
  activeOrganizationId: string | null;
  activeTamagotchi: Tamagotchi | null;
}

export const getUserWithAllDataAction = async (): Promise<
  ActionResponse<UserWithAllData | null>
> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse({ data: null });

    const [prismaUser, organizationsResponse] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
      }),
      auth.api.listOrganizations({
        headers: await headers(),
      }),
    ]);

    if (!prismaUser) return getActionResponse({ data: null });

    const organizations = (organizationsResponse || []) as Array<{
      id: string;
      name: string;
    }>;
    const orgIds = organizations.map((o) => o.id);

    const tamagotchis = await prisma.tamagotchi.findMany({
      where: { organizationId: { in: orgIds } },
    });

    const organizationsWithTamagotchi: OrganizationWithTamagotchi[] =
      organizations.map((org) => ({
        ...org,
        slug: org.id,
        logo: null,
        metadata: null,
        createdAt: new Date(),
        createdBy: session.user.id,
        tamagotchi: tamagotchis.find((t) => t.organizationId === org.id) || null,
      }));

    const activeOrganizationId = session.session?.activeOrganizationId || null;
    const activeTamagotchi = activeOrganizationId
      ? tamagotchis.find((t) => t.organizationId === activeOrganizationId) || null
      : null;

    return getActionResponse({
      data: {
        user: prismaUser,
        organizations: organizationsWithTamagotchi,
        activeOrganizationId,
        activeTamagotchi,
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getUserAction = async (): Promise<ActionResponse<user | null>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse({ data: null });

    const prismaUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    return getActionResponse({ data: prismaUser });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const clearAuthCookiesAction = async (): Promise<ActionResponse<void>> => {
  try {
    await clearAuthCookies();
    return getActionResponse({ data: undefined });
  } catch (error) {
    return getActionResponse({ error });
  }
};
