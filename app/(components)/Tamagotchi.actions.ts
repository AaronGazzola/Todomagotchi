"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { createRLSClient } from "@/lib/prisma-rls";
import { sseBroadcaster } from "@/lib/sse-broadcaster";
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

const SPECIES_OPTIONS = [
  "species0",
  "species1",
  "species2",
  "species3",
  "species4",
  "species5",
  "species6",
  "species7",
  "species8",
  "species9",
];

const COLOR_OPTIONS = [
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

const getRandomSpecies = (): string => {
  return SPECIES_OPTIONS[Math.floor(Math.random() * SPECIES_OPTIONS.length)];
};

const getRandomColor = (): string => {
  return COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
};

export const feedTamagotchiHelper = async (
  db: ReturnType<typeof createRLSClient>,
  activeOrganizationId: string
): Promise<Tamagotchi> => {
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
  let newSpecies = tamagotchi.species;

  if (tamagotchi.age === 0) {
    newAge = 1;
    newHunger = 7;
  } else if (newFeedCount >= 25) {
    newAge = 0;
    resetFeedCount = 0;
    newSpecies = getRandomSpecies();
  } else if (newFeedCount >= 15 && tamagotchi.age < 3) {
    newAge = 3;
  } else if (newFeedCount >= 10 && tamagotchi.age < 2) {
    newAge = 2;
  } else if (newFeedCount >= 5 && tamagotchi.age < 1) {
    newAge = 1;
  }

  const updatedTamagotchi = await db.tamagotchi.update({
    where: { organizationId: activeOrganizationId },
    data: {
      hunger: newHunger,
      feedCount: resetFeedCount,
      age: newAge,
      species: newSpecies,
      lastFedAt: new Date(),
    },
  });

  return updatedTamagotchi;
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

    const updatedTamagotchi = await feedTamagotchiHelper(
      db,
      activeOrganizationId
    );

    sseBroadcaster.notifyTamagotchi(activeOrganizationId);

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
      (now.getTime() - lastChecked.getTime()) / (1000 * 30)
    );

    if (minutesPassed < 1) {
      return getActionResponse({ data: tamagotchi });
    }

    const hungerDecrease = Math.min(minutesPassed, tamagotchi.hunger);
    const newHunger = !tamagotchi.age
      ? tamagotchi.hunger
      : Math.max(0, tamagotchi.hunger - hungerDecrease);
    const newAge = newHunger === 0 ? 0 : tamagotchi.age;
    const newSpecies =
      newHunger === 0 ? getRandomSpecies() : tamagotchi.species;

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: {
        hunger: newHunger,
        lastCheckedAt: now,
        age: newAge,
        species: newSpecies,
        feedCount: newHunger === 0 ? 0 : tamagotchi.feedCount,
      },
    });

    sseBroadcaster.notifyTamagotchi(activeOrganizationId);

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateTamagotchiSpeciesAction = async (
  species: string
): Promise<ActionResponse<Tamagotchi>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: { species },
    });

    sseBroadcaster.notifyTamagotchi(activeOrganizationId);

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateTamagotchiAgeAction = async (
  age: number
): Promise<ActionResponse<Tamagotchi>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: { age },
    });

    sseBroadcaster.notifyTamagotchi(activeOrganizationId);

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    return getActionResponse({ error });
  }
};
