"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PendingInvitation } from "./AvatarMenu.types";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export const useInvitationSSE = (enabled: boolean) => {
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
        const eventSource = new EventSource("/api/invitations/stream");
        eventSourceRef.current = eventSource;

        conditionalLog(
          {
            message: "SSE - EventSource created",
            readyState: eventSource.readyState,
            url: "/api/invitations/stream",
          },
          { label: LOG_LABELS.REALTIME }
        );

        if (typeof window !== "undefined") {
          (window as any).__eventSource = eventSource;
        }

        eventSource.onmessage = (event) => {
          try {
            const invitations: PendingInvitation[] = JSON.parse(event.data);
            conditionalLog(
              {
                message: "SSE - Message received",
                invitationCount: invitations.length,
                listening: true,
              },
              { label: LOG_LABELS.REALTIME }
            );
            queryClient.setQueryData(["pending-invitations"], invitations);
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;

          if (typeof window !== "undefined") {
            (window as any).__eventSource = null;
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
        (window as any).__eventSource = null;
      }
    };
  }, [enabled, queryClient]);
};
