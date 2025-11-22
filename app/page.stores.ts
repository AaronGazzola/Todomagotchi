import { Message, Todo } from "@prisma/client";
import { create } from "zustand";

interface TodoState {
  todos: Todo[] | null;
  setTodos: (todos: Todo[]) => void;
  reset: () => void;
}

const initialTodoState = {
  todos: null,
};

export const useTodoStore = create<TodoState>()((set) => ({
  ...initialTodoState,
  setTodos: (todos) => set({ todos }),
  reset: () => set(initialTodoState),
}));

interface MessageState {
  messages: Message[] | null;
  setMessages: (messages: Message[]) => void;
  reset: () => void;
}

const initialMessageState = {
  messages: null,
};

export const useMessageStore = create<MessageState>()((set) => ({
  ...initialMessageState,
  setMessages: (messages) => set({ messages }),
  reset: () => set(initialMessageState),
}));
