"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { sseBroadcaster } from "@/lib/sse-broadcaster";
import { Todo } from "@prisma/client";
import { headers } from "next/headers";
import { feedTamagotchiHelper } from "./(components)/Tamagotchi.actions";

export const getTodosAction = async (): Promise<ActionResponse<Todo[]>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const todos = await db.todo.findMany({
      where: { organizationId: activeOrganizationId },
      orderBy: { createdAt: "desc" },
    });

    return getActionResponse({ data: todos });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const createTodoAction = async (
  text: string
): Promise<ActionResponse<Todo>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const todo = await db.todo.create({
      data: {
        text,
        organizationId: activeOrganizationId,
      },
    });

    await feedTamagotchiHelper(db, activeOrganizationId);

    sseBroadcaster.notifyTodos(activeOrganizationId);
    sseBroadcaster.notifyTamagotchi(activeOrganizationId);

    return getActionResponse({ data: todo });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const toggleTodoAction = async (
  id: string
): Promise<ActionResponse<Todo>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const todo = await db.todo.findUnique({ where: { id } });

    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.organizationId !== activeOrganizationId) {
      throw new Error("Todo does not belong to active organization");
    }

    const isBeingCompleted = !todo.completed;

    const updatedTodo = await db.todo.update({
      where: { id },
      data: { completed: !todo.completed },
    });

    if (isBeingCompleted) {
      await feedTamagotchiHelper(db, activeOrganizationId);
    }

    sseBroadcaster.notifyTodos(activeOrganizationId);
    sseBroadcaster.notifyTamagotchi(activeOrganizationId);

    return getActionResponse({ data: updatedTodo });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deleteTodoAction = async (
  id: string
): Promise<ActionResponse<void>> => {
  try {
    const { db } = await getAuthenticatedClient();
    const session = await auth.api.getSession({ headers: await headers() });

    const activeOrganizationId = session?.session?.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const todo = await db.todo.findUnique({ where: { id } });

    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.organizationId !== activeOrganizationId) {
      throw new Error("Todo does not belong to active organization");
    }

    await db.todo.delete({ where: { id } });

    sseBroadcaster.notifyTodos(activeOrganizationId);

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
