"use client";

import { AvatarMenu } from "@/app/(components)/AvatarMenu";
import { Tamagotchi } from "@/app/(components)/Tamagotchi";
import { TodoList } from "@/app/(components)/TodoList";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AvatarMenu />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_400px] md:gap-8">
          <TodoList />
          <Tamagotchi />
        </div>
      </div>
    </div>
  );
}
