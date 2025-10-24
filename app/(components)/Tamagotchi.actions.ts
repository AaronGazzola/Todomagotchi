"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Tamagotchi } from "@prisma/client";
import { headers } from "next/headers";

export const getTamagotchiAction = async (): Promise<
  ActionResponse<Tamagotchi | null>
> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      return getActionResponse({ data: null });
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    return getActionResponse({ data: tamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const feedTamagotchiAction = async (): Promise<
  ActionResponse<Tamagotchi>
> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    if (!tamagotchi) {
      throw new Error("Tamagotchi not found");
    }

    const newFeedCount = tamagotchi.feedCount + 1;
    let newAge = tamagotchi.age;
    let resetFeedCount = newFeedCount;
    let newHunger = Math.min(7, tamagotchi.hunger + 1);

    if (tamagotchi.age === 0) {
      newAge = 1;
      newHunger = 7;
    } else if (newFeedCount >= 50) {
      newAge = 0;
      resetFeedCount = 0;
    } else if (newFeedCount >= 30 && tamagotchi.age < 3) {
      newAge = 3;
    } else if (newFeedCount >= 20 && tamagotchi.age < 2) {
      newAge = 2;
    } else if (newFeedCount >= 10 && tamagotchi.age < 1) {
      newAge = 1;
    }

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: {
        hunger: newHunger,
        feedCount: resetFeedCount,
        age: newAge,
        lastFedAt: new Date(),
      },
    });

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateTamagotchiHungerAction = async (): Promise<
  ActionResponse<Tamagotchi>
> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      return getActionResponse({ data: null as unknown as Tamagotchi });
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    if (!tamagotchi) {
      return getActionResponse({ data: null as unknown as Tamagotchi });
    }

    const now = new Date();
    const lastChecked = new Date(tamagotchi.lastCheckedAt);
    const minutesPassed = Math.floor(
      (now.getTime() - lastChecked.getTime()) / (1000 * 60)
    );

    if (minutesPassed < 1) {
      return getActionResponse({ data: tamagotchi });
    }

    const hungerDecrease = Math.min(minutesPassed, tamagotchi.hunger);
    const newHunger = Math.max(0, tamagotchi.hunger - hungerDecrease);

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: {
        hunger: newHunger,
        lastCheckedAt: now,
      },
    });

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};
