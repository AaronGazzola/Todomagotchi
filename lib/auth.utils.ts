import { User } from "better-auth";
import jwt from "jsonwebtoken";
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

export function generateSupabaseJWT(userId: string, userRole: string): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("SUPABASE_JWT_SECRET is required for JWT generation");
  }

  const payload = {
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: userId,
    email: `${userId}@better-auth.local`,
    role: "authenticated",
    user_metadata: {
      better_auth_user_id: userId,
      better_auth_role: userRole,
    },
    app_metadata: {
      provider: "better-auth",
      providers: ["better-auth"],
    },
  };

  return jwt.sign(payload, jwtSecret, {
    algorithm: "HS256",
  });
}
