"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { Message, Todo } from "@prisma/client";
import { feedTamagotchiHelper } from "./(components)/Tamagotchi.actions";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createHistoryEntry, getActorContext } from "@/lib/history.utils";
import { TODO_INTERACTIONS } from "./(components)/History.types";

export const getTodosAction = async (): Promise<ActionResponse<Todo[]>> => {
  try {
    conditionalLog(
      { message: "getTodosAction - start" },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    conditionalLog(
      { message: "getTodosAction - activeOrganizationId", activeOrganizationId },
      { label: LOG_LABELS.TODOS_ACTIONS }
    );

    const todos = await db.todo.findMany({
      where: activeOrganizationId
        ? { organizationId: activeOrganizationId }
        : {},
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

    const hasPermission = await auth.api.hasPermission({
      headers: await headers(),
      body: {
        permissions: {
          todo: ["create"],
        },
      },
    });

    if (!hasPermission) {
      throw new Error("Insufficient permissions to create todos");
    }

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

    const actorContext = await getActorContext(
      db,
      session.user.id,
      session.user.name,
      session.user.email,
      activeOrganizationId
    );

    await createHistoryEntry({
      db,
      organizationId: activeOrganizationId,
      interactionType: TODO_INTERACTIONS.TODO_CREATED,
      entityType: "todo",
      entityId: todo.id,
      actorContext,
      metadata: { text: todo.text },
    });

    await feedTamagotchiHelper(db, activeOrganizationId, actorContext);

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

    const hasPermission = await auth.api.hasPermission({
      headers: await headers(),
      body: {
        permissions: {
          todo: ["update"],
        },
      },
    });

    if (!hasPermission) {
      throw new Error("Insufficient permissions to update todos");
    }

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

    const actorContext = await getActorContext(
      db,
      session.user.id,
      session.user.name,
      session.user.email,
      activeOrganizationId
    );

    await createHistoryEntry({
      db,
      organizationId: activeOrganizationId,
      interactionType: isBeingCompleted
        ? TODO_INTERACTIONS.TODO_COMPLETED
        : TODO_INTERACTIONS.TODO_UNCOMPLETED,
      entityType: "todo",
      entityId: todo.id,
      actorContext,
      metadata: { text: todo.text },
    });

    if (isBeingCompleted) {
      await feedTamagotchiHelper(db, activeOrganizationId, actorContext);
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

    const hasPermission = await auth.api.hasPermission({
      headers: await headers(),
      body: {
        permissions: {
          todo: ["delete"],
        },
      },
    });

    if (!hasPermission) {
      throw new Error("Insufficient permissions to delete todos");
    }

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

    const actorContext = await getActorContext(
      db,
      session.user.id,
      session.user.name,
      session.user.email,
      activeOrganizationId
    );

    await createHistoryEntry({
      db,
      organizationId: activeOrganizationId,
      interactionType: TODO_INTERACTIONS.TODO_DELETED,
      entityType: "todo",
      entityId: todo.id,
      actorContext,
      metadata: { text: todo.text },
    });

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

export const getMessagesAction = async (): Promise<
  ActionResponse<Message[]>
> => {
  try {
    conditionalLog(
      { message: "getMessagesAction - start" },
      { label: LOG_LABELS.MESSAGES }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;

    conditionalLog(
      { message: "getMessagesAction - activeOrganizationId", activeOrganizationId },
      { label: LOG_LABELS.MESSAGES }
    );

    const messages = await db.message.findMany({
      where: activeOrganizationId
        ? { organizationId: activeOrganizationId }
        : {},
      orderBy: { createdAt: "asc" },
    });

    conditionalLog(
      { message: "getMessagesAction - result", messagesCount: messages.length, messages },
      { label: LOG_LABELS.MESSAGES }
    );
    return getActionResponse({ data: messages });
  } catch (error) {
    conditionalLog(
      { message: "getMessagesAction - error", error },
      { label: LOG_LABELS.MESSAGES }
    );
    return getActionResponse({ error });
  }
};

export const createMessageAction = async (
  text: string
): Promise<ActionResponse<Message>> => {
  try {
    conditionalLog(
      { message: "createMessageAction - start", text },
      { label: LOG_LABELS.MESSAGES }
    );
    const { db, session } = await getAuthenticatedClient();

    const activeOrganizationId = session.session.activeOrganizationId;
    const userId = session.user.id;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const message = await db.message.create({
      data: {
        text,
        organizationId: activeOrganizationId,
        userId,
      },
    });

    conditionalLog(
      { message: "createMessageAction - message created", data: message },
      { label: LOG_LABELS.MESSAGES }
    );

    return getActionResponse({ data: message });
  } catch (error) {
    conditionalLog(
      { message: "createMessageAction - error", error },
      { label: LOG_LABELS.MESSAGES }
    );
    return getActionResponse({ error });
  }
};
