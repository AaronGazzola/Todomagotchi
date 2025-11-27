import { create } from "zustand";
import { HistoryItem } from "./History.types";

interface HistoryState {
  history: HistoryItem[] | null;
  nextCursor: string | null;
  hasMore: boolean;
  setHistory: (history: HistoryItem[]) => void;
  appendHistory: (items: HistoryItem[], nextCursor: string | null, hasMore: boolean) => void;
  setNextCursor: (cursor: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  reset: () => void;
}

const initialHistoryState = {
  history: null,
  nextCursor: null,
  hasMore: true,
};

export const useHistoryStore = create<HistoryState>()((set) => ({
  ...initialHistoryState,
  setHistory: (history) => set({ history }),
  appendHistory: (items, nextCursor, hasMore) =>
    set((state) => ({
      history: [...(state.history || []), ...items],
      nextCursor,
      hasMore,
    })),
  setNextCursor: (cursor) => set({ nextCursor: cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  reset: () => set(initialHistoryState),
}));
