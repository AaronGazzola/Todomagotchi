"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getHistoryAction } from "./History.actions";
import { useHistoryStore } from "./History.stores";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { useActiveOrganizationId } from "../layout.hooks";

export const useGetHistory = () => {
  const { setHistory, reset } = useHistoryStore();
  const activeOrganizationId = useActiveOrganizationId();

  const query = useInfiniteQuery({
    queryKey: ["history", activeOrganizationId],
    queryFn: async ({ pageParam }) => {
      conditionalLog(
        { message: "getHistoryAction - start", cursor: pageParam },
        { label: LOG_LABELS.HISTORY_HOOKS }
      );
      const { data, error } = await getHistoryAction(pageParam);
      conditionalLog(
        {
          message: "getHistoryAction - result",
          hasData: !!data,
          error: error || null,
          itemsCount: data?.items?.length || 0,
        },
        { label: LOG_LABELS.HISTORY_HOOKS }
      );
      if (error) throw new Error(error);
      return data!;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!activeOrganizationId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    reset();
  }, [activeOrganizationId, reset]);

  useEffect(() => {
    if (query.data) {
      const allItems = query.data.pages.flatMap((page) => page.items);
      setHistory(allItems);
      conditionalLog(
        {
          message: "history store updated",
          itemsCount: allItems.length,
        },
        { label: LOG_LABELS.HISTORY_HOOKS }
      );
    }
  }, [query.data, setHistory]);

  return query;
};

export const useInvalidateHistory = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["history"] });
  };
};
