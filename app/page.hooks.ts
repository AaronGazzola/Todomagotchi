"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTodosAction,
  createTodoAction,
  toggleTodoAction,
  deleteTodoAction,
} from "./page.actions";

export const useGetTodos = () => {
  return useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data, error } = await getTodosAction();
      if (error) throw new Error(error);
      return data || [];
    },
    staleTime: Infinity,
  });
};

export const useCreateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await createTodoAction(text);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Todo created");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to create todo", "Create Failed");
    },
  });
};

export const useToggleTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await toggleTodoAction(id);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to toggle todo", "Toggle Failed");
    },
  });
};

export const useDeleteTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteTodoAction(id);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      showSuccessToast("Todo deleted");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to delete todo", "Delete Failed");
    },
  });
};
