"use client";

import { TestId } from "@/test.types";
import { useEffect, useState } from "react";
import {
  SPRITES,
  SPRITE_HAMBONE,
  SPRITES_HUNGER,
  type SpriteGrid,
} from "./Tamagotchi.sprites";

const MAX_HUNGER = 7;

function PixelGrid({ sprite, color = "bg-gray-900" }: { sprite: SpriteGrid; color?: string }) {
  const cols = sprite[0]?.length || 10;
  return (
    <div
      className="inline-grid gap-0"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {sprite.map((row, rowIndex) =>
        row.map((pixel, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`w-3 h-3 ${pixel ? color : "bg-transparent"}`}
          />
        ))
      )}
    </div>
  );
}

function HungerBar({ hunger }: { hunger: number }) {
  return (
    <div
      className="flex justify-center items-center py-2"
      style={{ gap: "12px" }}
    >
      {Array.from({ length: MAX_HUNGER }).map((_, index) => (
        <div
          key={index}
          className="transition-opacity duration-300"
          style={{ opacity: index < hunger ? 1 : 0.2 }}
        >
          <PixelGrid sprite={SPRITE_HAMBONE} />
        </div>
      ))}
    </div>
  );
}

interface TamagotchiProps {
  hunger: number;
  onFeed: () => void;
}

export function Tamagotchi({ hunger, onFeed }: TamagotchiProps) {
  const [currentSpriteIndex, setCurrentSpriteIndex] = useState(0);
  const [currentHungerIndex, setCurrentHungerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSpriteIndex((prev) => (prev + 1) % SPRITES.length);
      setCurrentHungerIndex((prev) => (prev + 1) % SPRITES_HUNGER.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const displaySprite =
    hunger === 0 ? SPRITES_HUNGER[currentHungerIndex] : SPRITES[currentSpriteIndex];

  return (
    <div
      className="relative mx-auto w-full max-w-[400px]"
      data-testid={TestId.TAMAGOTCHI_CONTAINER}
    >
      <div className="relative bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 rounded-[50%] aspect-[4/5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-[6px] border-cyan-500">
        <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none" />

        <div className="relative w-full h-full flex flex-col items-center justify-center pb-10 gap-2">
          <div
            className="flex flex-col justify-center items-center bg-gradient-to-br from-lime-50 via-amber-50 to-lime-100 rounded-xl p-4 w-full shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)]"
            style={{ minHeight: "240px" }}
            data-testid={TestId.TAMAGOTCHI_SCREEN}
          >
            <div className="flex items-center justify-center" style={{ minHeight: "160px" }}>
              <PixelGrid
                sprite={displaySprite}
                color="bg-gray-900"
              />
            </div>
            <HungerBar hunger={hunger} />
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-10">
          <button
            onClick={onFeed}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 shadow-[0_4px_0_rgba(219,39,119,0.5),0_6px_10px_rgba(0,0,0,0.3)] border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all active:shadow-[0_1px_0_rgba(219,39,119,0.5)] active:translate-y-1"
            data-testid={TestId.TAMAGOTCHI_BUTTON_LEFT}
          />
          <button
            onClick={onFeed}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 shadow-[0_4px_0_rgba(219,39,119,0.5),0_6px_10px_rgba(0,0,0,0.3)] border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all active:shadow-[0_1px_0_rgba(219,39,119,0.5)] active:translate-y-1"
            data-testid={TestId.TAMAGOTCHI_BUTTON_CENTER}
          />
          <button
            onClick={onFeed}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 shadow-[0_4px_0_rgba(219,39,119,0.5),0_6px_10px_rgba(0,0,0,0.3)] border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all active:shadow-[0_1px_0_rgba(219,39,119,0.5)] active:translate-y-1"
            data-testid={TestId.TAMAGOTCHI_BUTTON_RIGHT}
          />
        </div>
      </div>
    </div>
  );
}
