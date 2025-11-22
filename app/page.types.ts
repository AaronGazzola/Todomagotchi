export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export type PixelGrid = boolean[][];

export interface SpriteFrame {
  grid: PixelGrid;
  duration?: number;
}

export type AgeStage = "young" | "teen" | "adult";
export type TamagotchiStateType = "idle" | "happy" | "sad" | "hungry" | "sleepy" | "playing" | "eating" | "pooping" | "cleaning";

export interface TamagotchiState {
  hunger: number;
  happiness: number;
  wasteCount: number;
  age: string;
  state: TamagotchiStateType;
  currentFrame: number;
  ageInHours: number;
  ageStage: AgeStage;
}

export interface User {
  name: string;
  email: string;
}

export type { Message } from "@prisma/client";
