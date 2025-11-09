"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { configuration } from "@/configuration";
import { signIn, organization, getSession } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { SignInData } from "./page.types";
import { getUserOrganizationsAction } from "@/app/(components)/AvatarMenu.actions";

export const useSignIn = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (signInData: SignInData) => {
      const result = await signIn.email({
        email: signInData.email,
        password: signInData.password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to sign in");
      }

      let sessionResult = await getSession();

      if (!sessionResult?.data?.session?.activeOrganizationId) {
        const { data: organizations } = await getUserOrganizationsAction();
        if (organizations && Array.isArray(organizations) && organizations.length > 0) {
          await organization.setActive({ organizationId: organizations[0].id });
          let retries = 0;
          while (retries < 10) {
            sessionResult = await getSession();
            if (sessionResult?.data?.session?.activeOrganizationId) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            retries++;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["user"] });

      showSuccessToast("Signed in successfully");
      router.push(configuration.paths.home);

      return result.data;
    },
    onSuccess: () => {
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign in", "Sign In Failed");
    },
  });
};
