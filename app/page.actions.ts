"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Todo } from "@prisma/client";
import { feedTamagotchiHelper } from "./(components)/Tamagotchi.actions";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export const getTodosAction = async (): Promise<ActionResponse<Todo[]>> => {
  try {
    conditionalLog(
      { message: "getTodosAction - start" },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    conditionalLog(
      { message: "getTodosAction - activeOrganizationId", activeOrganizationId },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );

    const todos = await db.todo.findMany({
      where: { organizationId: activeOrganizationId },
      orderBy: { createdAt: "desc" },
    });

    conditionalLog(
      { message: "getTodosAction - result", todosCount: todos.length, todos },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    return getActionResponse({ data: todos });
  } catch (error) {
    conditionalLog(
      { message: "getTodosAction - error", error },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    return getActionResponse({ error });
  }
};

export const createTodoAction = async (
  text: string
): Promise<ActionResponse<Todo>> => {
  try {
    conditionalLog(
      { message: "createTodoAction - start", text },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const todo = await db.todo.create({
      data: {
        text,
        organizationId: activeOrganizationId,
      },
    });

    conditionalLog(
      { message: "createTodoAction - todo created", todo },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );

    await feedTamagotchiHelper(db, activeOrganizationId);

    return getActionResponse({ data: todo });
  } catch (error) {
    conditionalLog(
      { message: "createTodoAction - error", error },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    return getActionResponse({ error });
  }
};

export const toggleTodoAction = async (
  id: string
): Promise<ActionResponse<Todo>> => {
  try {
    conditionalLog(
      { message: "toggleTodoAction - start", id },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

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
    conditionalLog(
      { message: "toggleTodoAction - toggling", isBeingCompleted },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );

    const updatedTodo = await db.todo.update({
      where: { id },
      data: { completed: !todo.completed },
    });

    if (isBeingCompleted) {
      await feedTamagotchiHelper(db, activeOrganizationId);
    }

    conditionalLog(
      { message: "toggleTodoAction - result", updatedTodo },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );

    return getActionResponse({ data: updatedTodo });
  } catch (error) {
    conditionalLog(
      { message: "toggleTodoAction - error", error },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    return getActionResponse({ error });
  }
};

export const deleteTodoAction = async (
  id: string
): Promise<ActionResponse<void>> => {
  try {
    conditionalLog(
      { message: "deleteTodoAction - start", id },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

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

    conditionalLog(
      { message: "deleteTodoAction - deleted" },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );

    return getActionResponse();
  } catch (error) {
    conditionalLog(
      { message: "deleteTodoAction - error", error },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    return getActionResponse({ error });
  }
};
