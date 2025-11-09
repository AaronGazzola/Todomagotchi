"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Todo } from "@prisma/client";

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

        eventSource.onmessage = (event) => {
          try {
            const todos: Todo[] = JSON.parse(event.data);
            queryClient.setQueryData(["todos"], todos);
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;

          if (mountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect();
              }
            }, 5000);
          }
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
    };
  }, [enabled, queryClient]);
};
