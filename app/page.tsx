"use client";

import { AvatarMenu } from "@/app/(components)/AvatarMenu";
import { InvitationToasts } from "@/app/(components)/InvitationToasts";
import { Tamagotchi } from "@/app/(components)/Tamagotchi";
import { TodoList } from "@/app/(components)/TodoList";
import { useSession } from "@/lib/auth-client";
import { useGetUser } from "./layout.hooks";

export default function Home() {
  useGetUser();

  const { data: session } = useSession();
  const hasActiveOrganization = !!session?.session?.activeOrganizationId;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AvatarMenu />
      <InvitationToasts />

      {hasActiveOrganization && (
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_400px] md:gap-8">
            <TodoList />
            <Tamagotchi />
          </div>
        </div>
      )}
    </div>
  );
}
