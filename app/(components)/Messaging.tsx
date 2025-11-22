"use client";

import { useCreateMessage, useGetMessages } from "@/app/page.hooks";
import { useMessageStore } from "@/app/page.stores";
import { Button } from "@/components/ui/button";
import { getBrowserAPI } from "@/lib/env.utils";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { TestId } from "@/test.types";
import { useCallback, useEffect, useRef, useState } from "react";

interface MessagingProps {
  isLoading?: boolean;
}

export function Messaging({ isLoading = false }: MessagingProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messages = useMessageStore((state) => state.messages) || [];

  const { mutate: createMessage, isPending: isSending } = useCreateMessage();
  useGetMessages();

  const localStorage = getBrowserAPI(() => window.localStorage);
  const lastReadKey = "messaging-last-read";

  const getLastReadTimestamp = useCallback((): number => {
    if (!localStorage) return 0;
    const stored = localStorage.getItem(lastReadKey);
    return stored ? parseInt(stored, 10) : 0;
  }, [localStorage, lastReadKey]);

  const updateLastReadTimestamp = useCallback(() => {
    if (!localStorage) return;
    const now = new Date().getTime();
    localStorage.setItem(lastReadKey, now.toString());
  }, [localStorage, lastReadKey]);

  const unreadCount = messages.filter((msg) => {
    const lastRead = getLastReadTimestamp();
    const messageTime = new Date(msg.createdAt).getTime();
    return messageTime > lastRead;
  }).length;

  conditionalLog(
    {
      message: "Messaging render",
      isLoading,
      isExpanded,
      messagesCount: messages.length,
      unreadCount,
    },
    { label: LOG_LABELS.MESSAGES }
  );

  useEffect(() => {
    if (isExpanded && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      updateLastReadTimestamp();
    }
  }, [isExpanded, updateLastReadTimestamp]);

  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSendMessage = () => {
    if (inputValue.trim().length < 1) {
      throw new Error("Message text must be at least 1 character");
    }

    createMessage(inputValue.trim(), {
      onSuccess: () => {
        setInputValue("");
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && inputValue.trim().length >= 1 && !isSending) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleExpanded = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (newExpandedState) {
      updateLastReadTimestamp();
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      data-testid={TestId.MESSAGE_COMPONENT}
      data-state={isExpanded ? "expanded" : "collapsed"}
    >
      {!isExpanded && (
        <div className="flex justify-end p-4">
          <button
            onClick={toggleExpanded}
            data-testid={TestId.MESSAGE_EXPAND_BUTTON}
            className="relative px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-lg transition-all"
          >
            Messages
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Messages
              </h3>
              <button
                onClick={toggleExpanded}
                data-testid={TestId.MESSAGE_COLLAPSE_BUTTON}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <div
              ref={chatContainerRef}
              className="overflow-y-auto p-4 space-y-3"
              style={{ maxHeight: "400px" }}
              data-testid={TestId.MESSAGE_CHAT_CONTAINER}
            >
              {messages.length === 0 ? (
                <div
                  className="text-center py-12 text-gray-500 dark:text-gray-400"
                  data-testid={TestId.MESSAGE_EMPTY_STATE}
                >
                  No messages yet. Start a conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex flex-col gap-1"
                    data-testid={TestId.MESSAGE_ITEM}
                    data-user-id={message.userId}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {message.userId.substring(0, 8)}
                      </span>
                      <span
                        className="text-xs text-gray-500 dark:text-gray-400"
                        data-testid={TestId.MESSAGE_TIMESTAMP}
                      >
                        {formatTimestamp(message.createdAt)}
                      </span>
                    </div>
                    <div
                      className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2"
                      data-testid={TestId.MESSAGE_TEXT}
                    >
                      {message.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSending}
                  placeholder="Type a message..."
                  data-testid={TestId.MESSAGE_INPUT}
                  className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={inputValue.trim().length < 1 || isSending}
                  data-testid={TestId.MESSAGE_SEND_BUTTON}
                  className="px-4"
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
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
