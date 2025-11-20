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
      conditionalLog(
        { message: "createTodoAction - start", text },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      const { data, error } = await createTodoAction(text);
      conditionalLog(
        {
          message: "createTodoAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      conditionalLog(
        { message: "useCreateTodo - onSuccess" },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Todo created");
    },
    onError: (error: Error) => {
      conditionalLog(
        { message: "useCreateTodo - onError", error: error.message },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      showErrorToast(error.message || "Failed to create todo", "Create Failed");
    },
  });
};

export const useToggleTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      conditionalLog(
        { message: "toggleTodoAction - start", id },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      const { data, error } = await toggleTodoAction(id);
      conditionalLog(
        {
          message: "toggleTodoAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      conditionalLog(
        { message: "useToggleTodo - onSuccess" },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
    },
    onError: (error: Error) => {
      conditionalLog(
        { message: "useToggleTodo - onError", error: error.message },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      showErrorToast(error.message || "Failed to toggle todo", "Toggle Failed");
    },
  });
};

export const useDeleteTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      conditionalLog(
        { message: "deleteTodoAction - start", id },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      const { error } = await deleteTodoAction(id);
      conditionalLog(
        {
          message: "deleteTodoAction - result",
          error: error || null,
        },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      conditionalLog(
        { message: "useDeleteTodo - onSuccess" },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      showSuccessToast("Todo deleted");
    },
    onError: (error: Error) => {
      conditionalLog(
        { message: "useDeleteTodo - onError", error: error.message },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      showErrorToast(error.message || "Failed to delete todo", "Delete Failed");
    },
  });
};
