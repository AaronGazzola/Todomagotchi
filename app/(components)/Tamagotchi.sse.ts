"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tamagotchi } from "@prisma/client";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export const useTamagotchiSSE = (enabled: boolean) => {
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
        const eventSource = new EventSource("/api/tamagotchi/stream");
        eventSourceRef.current = eventSource;

        conditionalLog(
          {
            message: "SSE - EventSource created",
            readyState: eventSource.readyState,
            url: "/api/tamagotchi/stream",
          },
          { label: LOG_LABELS.REALTIME }
        );

        if (typeof window !== "undefined") {
          (window as unknown as { __tamagotchiEventSource: EventSource }).__tamagotchiEventSource = eventSource;
        }

        eventSource.onmessage = (event) => {
          try {
            const tamagotchi: Tamagotchi | null = JSON.parse(event.data);
            conditionalLog(
              {
                message: "SSE - Message received",
                tamagotchi: tamagotchi ? "present" : "null",
                listening: true,
              },
              { label: LOG_LABELS.REALTIME }
            );
            queryClient.setQueryData(["tamagotchi"], tamagotchi);
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;

          if (typeof window !== "undefined") {
            (window as unknown as { __tamagotchiEventSource: EventSource | null }).__tamagotchiEventSource = null;
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
        (window as unknown as { __tamagotchiEventSource: EventSource | null }).__tamagotchiEventSource = null;
      }
    };
  }, [enabled, queryClient]);
};
