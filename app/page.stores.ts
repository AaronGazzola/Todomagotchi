import { Todo } from "@prisma/client";
import { create } from "zustand";

interface TodoState {
  todos: Todo[] | null;
  setTodos: (todos: Todo[]) => void;
  reset: () => void;
}

const initialState = {
  todos: null,
};

export const useTodoStore = create<TodoState>()((set) => ({
  ...initialState,
  setTodos: (todos) => set({ todos }),
  reset: () => set(initialState),
}));
