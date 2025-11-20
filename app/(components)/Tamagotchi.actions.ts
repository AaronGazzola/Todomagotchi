"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { createRLSClient } from "@/lib/prisma-rls";
import { Tamagotchi } from "@prisma/client";

export const getTamagotchiAction = async (): Promise<
  ActionResponse<Tamagotchi | null>
> => {
  try {
    conditionalLog(
      { message: "getTamagotchiAction - start" },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;
    conditionalLog(
      {
        message: "getTamagotchiAction - activeOrganizationId",
        activeOrganizationId,
      },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId ?? undefined },
    });

    conditionalLog(
      {
        message: "getTamagotchiAction - result",
        hasTamagotchi: !!tamagotchi,
        tamagotchi,
      },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    return getActionResponse({ data: tamagotchi });
  } catch (error) {
    conditionalLog(
      { message: "getTamagotchiAction - error", error },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
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
    conditionalLog(
      { message: "feedTamagotchiAction - start" },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    conditionalLog(
      {
        message: "feedTamagotchiAction - activeOrganizationId",
        activeOrganizationId,
      },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    const updatedTamagotchi = await feedTamagotchiHelper(
      db,
      activeOrganizationId
    );

    conditionalLog(
      { message: "feedTamagotchiAction - result", updatedTamagotchi },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    conditionalLog(
      { message: "feedTamagotchiAction - error", error },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    return getActionResponse({ error });
  }
};

export const updateTamagotchiHungerAction = async (): Promise<
  ActionResponse<Tamagotchi>
> => {
  try {
    conditionalLog(
      { message: "updateTamagotchiHungerAction - start" },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    if (!tamagotchi) {
      conditionalLog(
        { message: "updateTamagotchiHungerAction - tamagotchi not found" },
        { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
      );
      return getActionResponse({ data: null as unknown as Tamagotchi });
    }

    const now = new Date();
    const lastChecked = new Date(tamagotchi.lastCheckedAt);
    const minutesPassed = Math.floor(
      (now.getTime() - lastChecked.getTime()) / (1000 * 30)
    );

    conditionalLog(
      { message: "updateTamagotchiHungerAction - time check", minutesPassed },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    if (minutesPassed < 1) {
      conditionalLog(
        { message: "updateTamagotchiHungerAction - no update needed" },
        { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
      );
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

    conditionalLog(
      { message: "updateTamagotchiHungerAction - result", updatedTamagotchi },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    conditionalLog(
      { message: "updateTamagotchiHungerAction - error", error },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    return getActionResponse({ error });
  }
};

export const updateTamagotchiSpeciesAction = async (
  species: string
): Promise<ActionResponse<Tamagotchi>> => {
  try {
    conditionalLog(
      { message: "updateTamagotchiSpeciesAction - start", species },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: { species },
    });

    conditionalLog(
      { message: "updateTamagotchiSpeciesAction - result", updatedTamagotchi },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    conditionalLog(
      { message: "updateTamagotchiSpeciesAction - error", error },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    return getActionResponse({ error });
  }
};

export const updateTamagotchiAgeAction = async (
  age: number
): Promise<ActionResponse<Tamagotchi>> => {
  try {
    conditionalLog(
      { message: "updateTamagotchiAgeAction - start", age },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const updatedTamagotchi = await db.tamagotchi.update({
      where: { organizationId: activeOrganizationId },
      data: { age },
    });

    conditionalLog(
      { message: "updateTamagotchiAgeAction - result", updatedTamagotchi },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );

    return getActionResponse({ data: updatedTamagotchi });
  } catch (error) {
    conditionalLog(
      { message: "updateTamagotchiAgeAction - error", error },
      { label: LOG_LABELS.TAMAGOTCHI_ACTIONS }
    );
    return getActionResponse({ error });
  }
};
