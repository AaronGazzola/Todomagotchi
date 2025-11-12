import { User } from "better-auth";
import { cookies, headers } from "next/headers";
import { auth, Session } from "./auth";
import { createRLSClient } from "./prisma-rls";

export async function getAuthenticatedClient(user?: User): Promise<{
  db: ReturnType<typeof createRLSClient>;
  session: Session | null;
}> {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  const userId = user?.id || session?.user.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const activeOrganizationId = session?.session?.activeOrganizationId;

  if (!activeOrganizationId) {
    throw new Error("No active organization");
  }

  const db = createRLSClient(userId, activeOrganizationId);

  return { db, session };
}

export const hasAuthCookie = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll();

  const hasBetterAuthCookie = authCookies.some(
    (cookie) =>
      cookie.name.includes("better-auth") || cookie.name.includes("session")
  );

  return hasBetterAuthCookie;
};

export const clearAuthCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  const authCookies = cookieStore.getAll();

  authCookies.forEach((cookie) => {
    if (cookie.name.includes("better-auth") || cookie.name.includes("session")) {
      cookieStore.delete(cookie.name);
    }
  });
};
