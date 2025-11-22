"use client";

import { AvatarMenu } from "@/app/(components)/AvatarMenu";
import { InvitationToasts } from "@/app/(components)/InvitationToasts";
import { Messaging } from "@/app/(components)/Messaging";
import { Tamagotchi } from "@/app/(components)/Tamagotchi";
import { TodoList } from "@/app/(components)/TodoList";
import { useActiveOrganizationId } from "./layout.hooks";
import { usePageData } from "./page.hooks";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export default function Home() {
  const { isLoading } = usePageData();

  const activeOrganizationId = useActiveOrganizationId();
  const hasActiveOrganization = !!activeOrganizationId;

  conditionalLog(
    {
      isLoading,
      activeOrganizationId,
      hasActiveOrganization,
    },
    { label: LOG_LABELS.HOME_PAGE }
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AvatarMenu />
      <InvitationToasts />

      {hasActiveOrganization && (
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_400px] md:gap-8">
            <TodoList isLoading={isLoading} />
            <Tamagotchi isLoading={isLoading} />
          </div>
        </div>
      )}

      {hasActiveOrganization && <Messaging isLoading={isLoading} />}
    </div>
  );
}
