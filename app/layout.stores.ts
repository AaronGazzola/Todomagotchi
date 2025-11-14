import { create } from "zustand";
import { AppState, OrganizationState, TamagotchiState } from "./layout.types";

const appInitialState = {
  user: null,
  activeOrganizationId: null,
};

export const useAppStore = create<AppState>()((set) => ({
  ...appInitialState,
  setUser: (user) => set({ user }),
  setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
  reset: () => set(appInitialState),
}));

const orgInitialState = {
  organizations: [],
};

export const useOrganizationStore = create<OrganizationState>()((set) => ({
  ...orgInitialState,
  setOrganizations: (orgs) => set({ organizations: orgs }),
  reset: () => set(orgInitialState),
}));

const tamagotchiInitialState = {
  tamagotchi: null,
};

export const useTamagotchiStore = create<TamagotchiState>()((set) => ({
  ...tamagotchiInitialState,
  setTamagotchi: (data) => set({ tamagotchi: data }),
  reset: () => set(tamagotchiInitialState),
}));
