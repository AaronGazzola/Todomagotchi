import { user, Tamagotchi } from "@prisma/client";

export interface OrganizationWithTamagotchi {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
  createdBy: string;
  tamagotchi: Tamagotchi | null;
}

export interface AppState {
  user: user | null;
  setUser: (user: user | null) => void;
  reset: () => void;
}

export interface OrganizationState {
  organizations: OrganizationWithTamagotchi[];
  setOrganizations: (orgs: OrganizationWithTamagotchi[]) => void;
  reset: () => void;
}

export interface TamagotchiState {
  tamagotchi: Tamagotchi | null;
  setTamagotchi: (data: Tamagotchi | null) => void;
  reset: () => void;
}
