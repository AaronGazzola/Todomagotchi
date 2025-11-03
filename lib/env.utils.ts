const isBrowser = typeof window !== "undefined";

export const ENV = {
  DATABASE_URL: isBrowser
    ? ""
    : process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: isBrowser
    ? ""
    : process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: isBrowser
    ? ""
    : process.env.BETTER_AUTH_URL || "",
  NEXT_PUBLIC_APP_URL: isBrowser
    ? (process as any).env?.NEXT_PUBLIC_APP_URL || ""
    : process.env.NEXT_PUBLIC_APP_URL || "",
};

export function getBrowserAPI<T>(accessor: () => T): T | null {
  if (isBrowser) {
    try {
      return accessor();
    } catch {
      return null;
    }
  }
  return null;
}
