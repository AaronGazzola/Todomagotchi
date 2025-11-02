"use client";

import { getSpriteForTamagotchi, type TamagotchiSpecies } from "./Tamagotchi.utils";

function SpriteRenderer({
  grid,
  color,
}: {
  grid: (0 | 1)[][];
  color: string;
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

export function SpriteGridViewer({ color, onClose }: { color: string; onClose?: () => void }) {
  const species = Array.from({ length: 10 }, (_, i) => `species${i}` as TamagotchiSpecies);
  const ages = [
    { value: 0, label: "Egg" },
    { value: 1, label: "Baby" },
    { value: 2, label: "Child" },
    { value: 3, label: "Adult" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Sprite Grid - All Species & Ages</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-all text-sm font-medium text-gray-800"
            >
              Close
            </button>
          )}
        </div>

        <div className="grid gap-6">
          {species.map((s) => (
            <div key={s} className="border-2 border-gray-300 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">{s}</h3>
              <div className="grid grid-cols-4 gap-4">
                {ages.map((age) => (
                  <div key={age.value} className="flex flex-col items-center gap-2">
                    <div className="text-sm font-medium text-gray-600">{age.label}</div>
                    <div className="bg-gradient-to-br from-lime-50 via-amber-50 to-lime-100 rounded p-4 flex items-center justify-center min-h-[120px]">
                      <SpriteRenderer
                        grid={getSpriteForTamagotchi(s, age.value)}
                        color={color}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
