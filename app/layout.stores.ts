import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState } from "./layout.types";

const initialState = {
  user: null,
  activeOrganizationId: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) => set({ user }),
      setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
      reset: () => set(initialState),
    }),
    {
      name: "app-storage",
    }
  )
);
