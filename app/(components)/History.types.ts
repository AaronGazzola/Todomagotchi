import { History } from "@prisma/client";

export const TODO_INTERACTIONS = {
  TODO_CREATED: "todo_created",
  TODO_COMPLETED: "todo_completed",
  TODO_UNCOMPLETED: "todo_uncompleted",
  TODO_DELETED: "todo_deleted",
} as const;

export const TAMAGOTCHI_INTERACTIONS = {
  TAMAGOTCHI_FED: "tamagotchi_fed",
  TAMAGOTCHI_SPECIES_CHANGED: "tamagotchi_species_changed",
  TAMAGOTCHI_AGE_CHANGED: "tamagotchi_age_changed",
} as const;

export const INTERACTION_TYPES = {
  ...TODO_INTERACTIONS,
  ...TAMAGOTCHI_INTERACTIONS,
} as const;

export type InteractionType =
  (typeof INTERACTION_TYPES)[keyof typeof INTERACTION_TYPES];

export type EntityType = "todo" | "tamagotchi";

export type ActorRole = "member" | "admin" | "owner";

export type HistoryItem = Omit<History, "metadata"> & {
  metadata: HistoryMetadata | null;
};

export interface TodoCreatedMetadata {
  text: string;
}

export interface TodoCompletedMetadata {
  text: string;
}

export interface TodoUncompletedMetadata {
  text: string;
}

export interface TodoDeletedMetadata {
  text: string;
}

export interface TamagotchiFedMetadata {
  hungerBefore: number;
  hungerAfter: number;
  feedCount: number;
  ageChange?: { from: number; to: number };
  speciesChange?: { from: string; to: string };
}

export interface TamagotchiSpeciesChangedMetadata {
  previousSpecies: string;
  newSpecies: string;
}

export interface TamagotchiAgeChangedMetadata {
  previousAge: number;
  newAge: number;
}

export type HistoryMetadata =
  | TodoCreatedMetadata
  | TodoCompletedMetadata
  | TodoUncompletedMetadata
  | TodoDeletedMetadata
  | TamagotchiFedMetadata
  | TamagotchiSpeciesChangedMetadata
  | TamagotchiAgeChangedMetadata;

export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
