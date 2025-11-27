"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { HistoryItem, HistoryPage } from "./History.types";

const PAGE_SIZE = 10;

export const getHistoryAction = async (
  cursor?: string
): Promise<ActionResponse<HistoryPage>> => {
  try {
    conditionalLog(
      { message: "getHistoryAction - start", cursor },
      { label: LOG_LABELS.HISTORY_ACTIONS }
    );

    const { db, session } = await getAuthenticatedClient();
    const activeOrganizationId = session.session.activeOrganizationId;

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    const whereClause: { organizationId: string; createdAt?: { lt: Date } } = {
      organizationId: activeOrganizationId,
    };

    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) };
    }

    const items = await db.history.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
    });

    const hasMore = items.length > PAGE_SIZE;
    const pageItems = hasMore ? items.slice(0, PAGE_SIZE) : items;

    const nextCursor =
      pageItems.length > 0
        ? pageItems[pageItems.length - 1].createdAt.toISOString()
        : null;

    conditionalLog(
      {
        message: "getHistoryAction - result",
        itemsCount: pageItems.length,
        hasMore,
        nextCursor,
      },
      { label: LOG_LABELS.HISTORY_ACTIONS }
    );

    return getActionResponse({
      data: {
        items: pageItems as HistoryItem[],
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    conditionalLog(
      { message: "getHistoryAction - error", error },
      { label: LOG_LABELS.HISTORY_ACTIONS }
    );
    return getActionResponse({ error });
  }
};
