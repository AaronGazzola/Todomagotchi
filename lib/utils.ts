type ClassValue = string | number | boolean | undefined | null | Record<string, boolean> | ClassValue[];

function flattenClass(value: ClassValue): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(flattenClass);
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }
  return [];
}

export function cn(...inputs: ClassValue[]): string {
  return flattenClass(inputs).filter(Boolean).join(" ");
}
