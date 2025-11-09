"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PendingInvitation } from "./AvatarMenu.types";

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

        eventSource.onmessage = (event) => {
          try {
            const invitations: PendingInvitation[] = JSON.parse(event.data);
            queryClient.setQueryData(["pending-invitations"], invitations);
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

        eventSource.onopen = () => {
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
