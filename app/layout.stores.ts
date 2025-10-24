import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  activeOrganizationId: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
      reset: () => set(initialState),
    }),
    {
      name: "app-storage",
    }
  )
);
