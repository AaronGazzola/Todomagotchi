"use client";

import {
  useCreateTodo,
  useDeleteTodo,
  useGetTodos,
  useToggleTodo,
} from "@/app/page.hooks";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TestId } from "@/test.types";
import { useState } from "react";

interface TodoListProps {
  onTodoAction?: () => void;
}

export function TodoList({ onTodoAction }: TodoListProps = {}) {
  const [inputValue, setInputValue] = useState("");

  const { data: todos = [], isLoading } = useGetTodos();
  const { mutate: createTodo, isPending: isCreating } = useCreateTodo();
  const { mutate: toggleTodo } = useToggleTodo();
  const { mutate: deleteTodo } = useDeleteTodo();

  const handleAddTodo = () => {
    if (inputValue.trim().length < 1) {
      throw new Error("Todo text must be at least 1 character");
    }

    createTodo(inputValue.trim(), {
      onSuccess: () => {
        setInputValue("");
        onTodoAction?.();
      },
    });
  };

  const handleToggleTodo = (id: string) => {
    toggleTodo(id, {
      onSuccess: () => {
        onTodoAction?.();
      },
    });
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim().length >= 1 && !isCreating) {
      handleAddTodo();
    }
  };

  if (isLoading) {
    return (
      <div
        className="space-y-6"
        data-testid={TestId.TODO_LIST}
      >
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="text-center py-12">
          <p className="text-white">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 "
      data-testid={TestId.TODO_LIST}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Tasks</h2>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isCreating}
            data-testid={TestId.TODO_INPUT}
            className="flex-1"
          />
          <Button
            onClick={handleAddTodo}
            data-testid={TestId.TODO_ADD_BUTTON}
            disabled={inputValue.trim().length < 1 || isCreating}
          >
            {isCreating ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <div
            className="text-center py-12 space-y-4"
            data-testid={TestId.TODO_EMPTY_STATE}
          >
            <div className="text-6xl">✓</div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-white">No tasks yet</p>
              <p className="text-sm text-white/70">
                Add a task above to get started
              </p>
            </div>
          </div>
        ) : (
          todos.map(
            (todo: { id: string; text: string; completed: boolean }) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
                data-testid={`${TestId.TODO_ITEM}-${todo.id}`}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => handleToggleTodo(todo.id)}
                  data-testid={`${TestId.TODO_CHECKBOX}-${todo.id}`}
                  aria-label={`Mark "${todo.text}" as ${
                    todo.completed ? "incomplete" : "complete"
                  }`}
                />
                <span
                  className={cn(
                    "flex-1 transition-all text-white",
                    todo.completed && "line-through text-white/50"
                  )}
                  data-testid={`${TestId.TODO_TEXT}-${todo.id}`}
                >
                  {todo.text}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTodo(todo.id)}
                  data-testid={`${TestId.TODO_DELETE_BUTTON}-${todo.id}`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Delete "${todo.text}"`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </Button>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
