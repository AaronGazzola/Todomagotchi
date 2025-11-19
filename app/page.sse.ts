"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Todo } from "@prisma/client";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export const useTodosSSE = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;

      try {
        const eventSource = new EventSource("/api/todos/stream");
        eventSourceRef.current = eventSource;

        conditionalLog(
          {
            message: "SSE - EventSource created",
            readyState: eventSource.readyState,
            url: "/api/todos/stream",
          },
          { label: LOG_LABELS.REALTIME }
        );

        if (typeof window !== "undefined") {
          (window as unknown as { __todosEventSource: EventSource }).__todosEventSource = eventSource;
        }

        eventSource.onmessage = (event) => {
          try {
            const todos: Todo[] = JSON.parse(event.data);
            conditionalLog(
              {
                message: "SSE - Message received",
                todoCount: todos.length,
                listening: true,
              },
              { label: LOG_LABELS.REALTIME }
            );
            queryClient.setQueryData(["todos"], todos);
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;

          if (typeof window !== "undefined") {
            (window as unknown as { __todosEventSource: EventSource | null }).__todosEventSource = null;
          }

          if (mountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, 5000);
          }
        };

        eventSource.onopen = () => {
          conditionalLog(
            {
              message: "SSE - Connection opened",
              readyState: eventSource.readyState,
            },
            { label: LOG_LABELS.REALTIME }
          );
        };
      } catch (error) {
        console.error("Failed to create EventSource:", error);
        if (mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (typeof window !== "undefined") {
        (window as unknown as { __todosEventSource: EventSource | null }).__todosEventSource = null;
      }
    };
  }, [enabled, queryClient]);
};
