"use client";

import { useState, useEffect } from "react";
import { AvatarMenu } from "@/app/(components)/AvatarMenu";
import { Tamagotchi } from "@/app/(components)/Tamagotchi";
import { TodoList } from "@/app/(components)/TodoList";

const MAX_HUNGER = 7;
const HUNGER_DEPLETION_INTERVAL = 5000;
const HUNGER_INCREMENT = 1;

export default function Home() {
  const [hunger, setHunger] = useState(MAX_HUNGER);

  useEffect(() => {
    setHunger((prev) => Math.max(0, prev - 1));

    const interval = setInterval(() => {
      setHunger((prev) => Math.max(0, prev - 1));
    }, HUNGER_DEPLETION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const feedTamagotchi = () => {
    setHunger((prev) => Math.min(MAX_HUNGER, prev + HUNGER_INCREMENT));
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AvatarMenu />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_400px] md:gap-8">
          <TodoList onTodoAction={feedTamagotchi} />
          <Tamagotchi hunger={hunger} onFeed={feedTamagotchi} />
        </div>
      </div>
    </div>
  );
}
