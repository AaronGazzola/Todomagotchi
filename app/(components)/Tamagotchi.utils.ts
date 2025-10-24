import {
  SPRITE_LEVEL1_BABY,
  SPRITE_LEVEL1_CHILD,
  SPRITE_LEVEL2_BABY,
  SPRITE_LEVEL2_CHILD,
  SPRITE_LEVEL2_ADULT,
  SPRITE_LEVEL3_BABY,
  SPRITE_LEVEL3_CHILD,
  SPRITE_LEVEL3_ADULT,
  SPRITE_LEVEL3_EVOLVED,
  SpriteGrid,
} from "./Tamagotchi.sprites";

export type TamagotchiSpecies =
  | "species0"
  | "species1"
  | "species2"
  | "species3"
  | "species4"
  | "species5"
  | "species6"
  | "species7"
  | "species8"
  | "species9";

const SPRITE_EGG: SpriteGrid = [
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
];

export function getSpriteForTamagotchi(
  species: TamagotchiSpecies,
  age: number
): SpriteGrid {
  const spriteKey = `${species}_age${age}`;

  const SPRITE_MAP: Record<string, SpriteGrid> = {
    species0_age0: SPRITE_EGG,
    species0_age1: SPRITE_LEVEL1_BABY,
    species0_age2: SPRITE_LEVEL1_CHILD,
    species0_age3: SPRITE_LEVEL2_ADULT,

    species1_age0: SPRITE_EGG,
    species1_age1: SPRITE_LEVEL1_BABY,
    species1_age2: SPRITE_LEVEL1_CHILD,
    species1_age3: SPRITE_LEVEL2_ADULT,

    species2_age0: SPRITE_EGG,
    species2_age1: SPRITE_LEVEL2_BABY,
    species2_age2: SPRITE_LEVEL2_CHILD,
    species2_age3: SPRITE_LEVEL2_ADULT,

    species3_age0: SPRITE_EGG,
    species3_age1: SPRITE_LEVEL2_BABY,
    species3_age2: SPRITE_LEVEL2_CHILD,
    species3_age3: SPRITE_LEVEL2_ADULT,

    species4_age0: SPRITE_EGG,
    species4_age1: SPRITE_LEVEL2_BABY,
    species4_age2: SPRITE_LEVEL2_CHILD,
    species4_age3: SPRITE_LEVEL3_EVOLVED,

    species5_age0: SPRITE_EGG,
    species5_age1: SPRITE_LEVEL3_BABY,
    species5_age2: SPRITE_LEVEL3_CHILD,
    species5_age3: SPRITE_LEVEL3_ADULT,

    species6_age0: SPRITE_EGG,
    species6_age1: SPRITE_LEVEL3_BABY,
    species6_age2: SPRITE_LEVEL3_CHILD,
    species6_age3: SPRITE_LEVEL3_ADULT,

    species7_age0: SPRITE_EGG,
    species7_age1: SPRITE_LEVEL3_BABY,
    species7_age2: SPRITE_LEVEL3_CHILD,
    species7_age3: SPRITE_LEVEL3_EVOLVED,

    species8_age0: SPRITE_EGG,
    species8_age1: SPRITE_LEVEL1_BABY,
    species8_age2: SPRITE_LEVEL2_CHILD,
    species8_age3: SPRITE_LEVEL3_ADULT,

    species9_age0: SPRITE_EGG,
    species9_age1: SPRITE_LEVEL2_BABY,
    species9_age2: SPRITE_LEVEL3_CHILD,
    species9_age3: SPRITE_LEVEL3_EVOLVED,
  };

  return SPRITE_MAP[spriteKey] || SPRITE_EGG;
}
