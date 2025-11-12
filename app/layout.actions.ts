"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { clearAuthCookies } from "@/lib/auth.utils";
import { prisma } from "@/lib/prisma";
import { user } from "@prisma/client";
import { headers } from "next/headers";

export const getUserAction = async (): Promise<ActionResponse<user | null>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse({ data: null });

    const prismaUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    return getActionResponse({ data: prismaUser });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const clearAuthCookiesAction = async (): Promise<ActionResponse<void>> => {
  try {
    await clearAuthCookies();
    return getActionResponse({ data: undefined });
  } catch (error) {
    return getActionResponse({ error });
  }
};
