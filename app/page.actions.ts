"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Todo } from "@prisma/client";
import { headers } from "next/headers";

export const getTodosAction = async (): Promise<ActionResponse<Todo[]>> => {
  try {
    const { db } = await getAuthenticatedClient();

    const todos = await db.todo.findMany({
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

    const tamagotchi = await db.tamagotchi.findUnique({
      where: { organizationId: activeOrganizationId },
    });

    if (tamagotchi) {
      await db.tamagotchi.update({
        where: { organizationId: activeOrganizationId },
        data: {
          hunger: Math.min(7, tamagotchi.hunger + 1),
        },
      });
    }

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

    const todo = await db.todo.findUnique({ where: { id } });

    if (!todo) {
      throw new Error("Todo not found");
    }

    const isBeingCompleted = !todo.completed;

    const updatedTodo = await db.todo.update({
      where: { id },
      data: { completed: !todo.completed },
    });

    if (isBeingCompleted && activeOrganizationId) {
      const tamagotchi = await db.tamagotchi.findUnique({
        where: { organizationId: activeOrganizationId },
      });

      if (tamagotchi) {
        await db.tamagotchi.update({
          where: { organizationId: activeOrganizationId },
          data: {
            hunger: Math.min(7, tamagotchi.hunger + 1),
          },
        });
      }
    }

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

    await db.todo.delete({ where: { id } });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
