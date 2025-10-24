"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";

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
