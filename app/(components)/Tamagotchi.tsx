"use client";

import { TestId } from "@/test.types";
import { useMemo } from "react";
import {
  useFeedTamagotchi,
  useGetTamagotchi,
  useHungerTimer,
  useUpdateTamagotchiSpecies,
  useUpdateTamagotchiAge,
} from "./Tamagotchi.hooks";
import { SPRITE_HAMBONE } from "./Tamagotchi.sprites";
import {
  getSpriteForTamagotchi,
  type TamagotchiSpecies,
} from "./Tamagotchi.utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function SpriteRenderer({
  grid,
  color,
  ...props
}: {
  grid: (0 | 1)[][];
  color: string;
  [key: string]: unknown;
}) {
  const gridSize = grid.length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize}, 3px)`,
        gridTemplateRows: `repeat(${gridSize}, 3px)`,
        gap: "1px",
      }}
      {...props}
    >
      {grid.flat().map((pixel, i) => (
        <div
          key={i}
          style={{
            width: "3px",
            height: "3px",
            backgroundColor: pixel ? color : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function HungerBar({
  level,
  color,
  ...props
}: {
  level: number;
  color: string;
  [key: string]: unknown;
}) {
  const hambones = Math.min(Math.max(0, level), 7);

  return (
    <div
      className="flex gap-1 justify-center"
      {...props}
    >
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={i < hambones ? "opacity-100" : "opacity-20"}
        >
          <SpriteRenderer
            grid={SPRITE_HAMBONE}
            color={color}
          />
        </div>
      ))}
    </div>
  );
}

export function Tamagotchi() {
  const { data: tamagotchi } = useGetTamagotchi();
  const { mutate: feedTamagotchi, isPending: isFeeding } = useFeedTamagotchi();
  const { mutate: updateSpecies } = useUpdateTamagotchiSpecies();
  const { mutate: updateAge } = useUpdateTamagotchiAge();
  useHungerTimer();

  const color = tamagotchi?.color || "#1f2937";
  const species = (tamagotchi?.species || "species0") as TamagotchiSpecies;
  const age = tamagotchi?.age || 0;

  const currentSprite = useMemo(
    () => getSpriteForTamagotchi(species, age),
    [species, age]
  );

  const handleFeed = () => {
    if (!isFeeding) {
      feedTamagotchi();
    }
  };

  if (!tamagotchi) {
    return null;
  }

  const isDevelopment = process.env.NODE_ENV === "development";
  const speciesOptions = Array.from({ length: 10 }, (_, i) => `species${i}`);
  const ageOptions = [
    { value: 0, label: "Egg" },
    { value: 1, label: "Baby" },
    { value: 2, label: "Child" },
    { value: 3, label: "Adult" },
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-[400px]"
      data-testid={TestId.TAMAGOTCHI_CONTAINER}
    >
      <div
        className="relative rounded-[50%] aspect-[4/5] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-[6px]"
        style={{
          background: `linear-gradient(to bottom right, ${color}, ${color}dd, ${color}bb)`,
          borderColor: color,
        }}
      >
        <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-white/20 via-transparent to-black/10 pointer-events-none" />

        <div className="relative w-full h-full flex flex-col items-center justify-center pb-10 gap-2">
          <div
            className="flex flex-col justify-center items-center bg-gradient-to-br from-lime-50 via-amber-50 to-lime-100 rounded-xl p-4 w-full shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)]"
            style={{ minHeight: "240px" }}
            data-testid={TestId.TAMAGOTCHI_SCREEN}
          >
            <div
              className="flex items-center justify-center"
              style={{ minHeight: "160px" }}
            >
              <SpriteRenderer
                grid={currentSprite}
                color={color}
                data-testid={TestId.TAMAGOTCHI_ANIMATION}
              />
            </div>
            <HungerBar
              level={tamagotchi?.hunger || 0}
              color={color}
              data-testid={TestId.TAMAGOTCHI_HUNGER_BAR}
            />
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-10">
          <button
            onClick={handleFeed}
            disabled={isFeeding}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 shadow-[0_4px_0_rgba(219,39,119,0.5),0_6px_10px_rgba(0,0,0,0.3)] border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all active:shadow-[0_1px_0_rgba(219,39,119,0.5)] active:translate-y-1 disabled:opacity-50"
            data-testid={TestId.TAMAGOTCHI_BUTTON_LEFT}
          />
          <button
            className="w-10 h-10 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 shadow-[0_4px_0_rgba(219,39,119,0.5),0_6px_10px_rgba(0,0,0,0.3)] border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all active:shadow-[0_1px_0_rgba(219,39,119,0.5)] active:translate-y-1"
            data-testid={TestId.TAMAGOTCHI_BUTTON_CENTER}
          />
          <button
            className="w-10 h-10 rounded-full bg-gradient-to-b from-pink-300 to-pink-400 shadow-[0_4px_0_rgba(219,39,119,0.5),0_6px_10px_rgba(0,0,0,0.3)] border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all active:shadow-[0_1px_0_rgba(219,39,119,0.5)] active:translate-y-1"
            data-testid={TestId.TAMAGOTCHI_BUTTON_RIGHT}
          />
        </div>
      </div>

      {isDevelopment && (
        <div className="flex gap-4 mt-4 justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-b from-pink-300 to-pink-400 shadow-md border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all text-sm font-medium text-gray-800">
                Species
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-2 gap-2">
                {speciesOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateSpecies(s)}
                    className={cn(
                      "px-3 py-2 rounded text-sm font-medium transition-all",
                      s === species
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-b from-pink-300 to-pink-400 shadow-md border-2 border-pink-500 hover:from-pink-400 hover:to-pink-500 transition-all text-sm font-medium text-gray-800">
                Age
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="flex flex-col gap-2">
                {ageOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateAge(option.value)}
                    className={cn(
                      "px-3 py-2 rounded text-sm font-medium transition-all text-left",
                      option.value === age
                        ? "bg-pink-500 text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
