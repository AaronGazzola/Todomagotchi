"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTodosAction,
  createTodoAction,
  toggleTodoAction,
  deleteTodoAction,
  getMessagesAction,
  createMessageAction,
} from "./page.actions";
import { useMessageStore, useTodoStore } from "./page.stores";
import { useActiveOrganizationId, useGetUser } from "./layout.hooks";
import { useGetTamagotchi } from "./(components)/Tamagotchi.hooks";
import { useEffect } from "react";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { organization } from "@/lib/auth-client";

export const useGetTodos = () => {
  const { setTodos } = useTodoStore();
  const activeOrganizationId = useActiveOrganizationId();

  const query = useQuery({
    queryKey: ["todos", activeOrganizationId],
    queryFn: async () => {
      conditionalLog(
        { message: "getTodosAction - start", activeOrganizationId },
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
    refetchInterval: 5000,
    enabled: !!activeOrganizationId,
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
    onSuccess: (data) => {
      conditionalLog(
        { message: "useCreateTodo - onSuccess", data },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      showSuccessToast("Todo created");
    },
    onError: (error: Error) => {
      console.error("[useCreateTodo] Error:", error.message, error);
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
    onSuccess: (data) => {
      conditionalLog(
        { message: "useToggleTodo - onSuccess", data },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (error: Error) => {
      console.error("[useToggleTodo] Error:", error.message, error);
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
      queryClient.invalidateQueries({ queryKey: ["history"] });
      showSuccessToast("Todo deleted");
    },
    onError: (error: Error) => {
      console.error("[useDeleteTodo] Error:", error.message, error);
      conditionalLog(
        { message: "useDeleteTodo - onError", error: error.message },
        { label: LOG_LABELS.TODOS_HOOKS }
      );
      showErrorToast(error.message || "Failed to delete todo", "Delete Failed");
    },
  });
};

export const useGetMessages = () => {
  const { setMessages } = useMessageStore();

  conditionalLog(
    {
      message: "useGetMessages - queryKey",
      queryKey: ["messages"],
    },
    { label: LOG_LABELS.MESSAGES }
  );

  const query = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      conditionalLog(
        { message: "getMessagesAction - start" },
        { label: LOG_LABELS.MESSAGES }
      );
      const { data, error } = await getMessagesAction();
      conditionalLog(
        {
          message: "getMessagesAction - result",
          hasData: !!data,
          error: error || null,
          messagesCount: data?.length || 0,
          messages: data || [],
        },
        { label: LOG_LABELS.MESSAGES }
      );
      if (error) throw new Error(error);
      return data || [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (query.data) {
      setMessages(query.data);
      conditionalLog(
        {
          message: "messages store updated",
          messagesCount: query.data.length,
        },
        { label: LOG_LABELS.MESSAGES }
      );
    }
  }, [query.data, setMessages]);

  return query;
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      conditionalLog(
        { message: "createMessageAction - start", text },
        { label: LOG_LABELS.MESSAGES }
      );
      const { data, error } = await createMessageAction(text);
      conditionalLog(
        {
          message: "createMessageAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.MESSAGES }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      conditionalLog(
        { message: "useCreateMessage - onSuccess" },
        { label: LOG_LABELS.MESSAGES }
      );
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (error: Error) => {
      console.error("[useCreateMessage] Error:", error.message, error);
      conditionalLog(
        { message: "useCreateMessage - onError", error: error.message },
        { label: LOG_LABELS.MESSAGES }
      );
      showErrorToast(error.message || "Failed to send message", "Send Failed");
    },
  });
};

export const useTodoPermissions = () => {
  const activeOrganizationId = useActiveOrganizationId();

  return useQuery({
    queryKey: ["todoPermissions", activeOrganizationId],
    queryFn: async () => {
      const hasCreate = await organization.hasPermission({
        permissions: { todo: ["create"] },
      });
      const hasDelete = await organization.hasPermission({
        permissions: { todo: ["delete"] },
      });
      return {
        canCreate: hasCreate?.data?.success ?? false,
        canDelete: hasDelete?.data?.success ?? false,
      };
    },
    enabled: !!activeOrganizationId,
  });
};
