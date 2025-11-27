"use client";

import { useHistoryStore } from "./History.stores";
import { useGetHistory } from "./History.hooks";
import { TestId } from "@/test.types";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  HistoryItem,
  TODO_INTERACTIONS,
  TAMAGOTCHI_INTERACTIONS,
} from "./History.types";

interface HistoryProps {
  isLoading?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatActionDescription(item: HistoryItem): string {
  const metadata = item.metadata;

  switch (item.interactionType) {
    case TODO_INTERACTIONS.TODO_CREATED:
      return `created task "${(metadata as { text?: string })?.text || "Unknown"}"`;
    case TODO_INTERACTIONS.TODO_COMPLETED:
      return `completed task "${(metadata as { text?: string })?.text || "Unknown"}"`;
    case TODO_INTERACTIONS.TODO_UNCOMPLETED:
      return `uncompleted task "${(metadata as { text?: string })?.text || "Unknown"}"`;
    case TODO_INTERACTIONS.TODO_DELETED:
      return `deleted task "${(metadata as { text?: string })?.text || "Unknown"}"`;
    case TAMAGOTCHI_INTERACTIONS.TAMAGOTCHI_FED:
      return "fed the Tamagotchi";
    case TAMAGOTCHI_INTERACTIONS.TAMAGOTCHI_SPECIES_CHANGED:
      return "changed Tamagotchi species";
    case TAMAGOTCHI_INTERACTIONS.TAMAGOTCHI_AGE_CHANGED:
      return "changed Tamagotchi age";
    default:
      return item.interactionType;
  }
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "owner":
      return "bg-amber-500/20 text-amber-300";
    case "admin":
      return "bg-blue-500/20 text-blue-300";
    case "member":
    default:
      return "bg-neutral-500/20 text-neutral-300";
  }
}

function getActionIcon(interactionType: string): string {
  if (interactionType.startsWith("todo_")) {
    switch (interactionType) {
      case TODO_INTERACTIONS.TODO_CREATED:
        return "+";
      case TODO_INTERACTIONS.TODO_COMPLETED:
        return "✓";
      case TODO_INTERACTIONS.TODO_UNCOMPLETED:
        return "○";
      case TODO_INTERACTIONS.TODO_DELETED:
        return "×";
      default:
        return "•";
    }
  }
  return "♥";
}

export function History({ isLoading = false }: HistoryProps) {
  const history = useHistoryStore((state) => state.history) || [];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useGetHistory();
  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid={TestId.HISTORY_CONTAINER}>
        <h2 className="text-2xl font-bold text-white">Activity</h2>
        <div className="text-center py-8">
          <p className="text-white/70">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={TestId.HISTORY_CONTAINER}>
      <h2 className="text-2xl font-bold text-white">Activity</h2>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {history.length === 0 ? (
          <div
            className="text-center py-8 space-y-2"
            data-testid={TestId.HISTORY_EMPTY_STATE}
          >
            <div className="text-4xl">📜</div>
            <p className="text-sm text-white/70">No activity yet</p>
          </div>
        ) : (
          <>
            {history.map((item: HistoryItem) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-900/50"
                data-testid={TestId.HISTORY_ITEM}
                data-id={item.id}
                data-interaction-type={item.interactionType}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    item.entityType === "todo"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-pink-500/20 text-pink-300"
                  )}
                >
                  {getActionIcon(item.interactionType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-medium text-white text-sm truncate"
                      data-testid={TestId.HISTORY_USER}
                    >
                      {item.actorName}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        getRoleBadgeColor(item.actorRole)
                      )}
                    >
                      {item.actorRole}
                    </span>
                  </div>
                  <p
                    className="text-sm text-white/70 mt-0.5"
                    data-testid={TestId.HISTORY_ACTION}
                  >
                    {formatActionDescription(item)}
                  </p>
                  <p
                    className="text-xs text-white/50 mt-1"
                    data-testid={TestId.HISTORY_TIMESTAMP}
                  >
                    {formatRelativeTime(new Date(item.createdAt))}
                  </p>
                </div>
              </div>
            ))}

            <div ref={observerRef} className="h-4" />

            {isFetchingNextPage && (
              <div
                className="text-center py-4"
                data-testid={TestId.HISTORY_LOADING_MORE}
              >
                <p className="text-sm text-white/50">Loading more...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
