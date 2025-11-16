"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTodosAction,
  createTodoAction,
  toggleTodoAction,
  deleteTodoAction,
} from "./page.actions";
import { useTodoStore } from "./page.stores";
import { useGetUser } from "./layout.hooks";
import { useGetTamagotchi } from "./(components)/Tamagotchi.hooks";
import { useEffect } from "react";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export const useGetTodos = () => {
  const { setTodos } = useTodoStore();

  const query = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      conditionalLog(
        { message: "getTodosAction - start" },
        { label: LOG_LABELS.TODOS }
      );
      const { data, error } = await getTodosAction();
      conditionalLog(
        {
          message: "getTodosAction - result",
          hasData: !!data,
          error: error || null,
          todosCount: data?.length || 0,
          todos: data || [],
        },
        { label: LOG_LABELS.TODOS }
      );
      if (error) throw new Error(error);
      return data || [];
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) {
      setTodos(query.data);
      conditionalLog(
        {
          message: "todos store updated",
          todosCount: query.data.length,
        },
        { label: LOG_LABELS.TODOS }
      );
    }
  }, [query.data, setTodos]);

  return query;
};

export const usePageData = () => {
  const user = useGetUser();
  const todos = useGetTodos();
  const tamagotchi = useGetTamagotchi();

  return {
    isLoading: user.isLoading || todos.isLoading || tamagotchi.isLoading,
    isFetching: user.isFetching || todos.isFetching || tamagotchi.isFetching,
    error: user.error || todos.error || tamagotchi.error,
  };
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
