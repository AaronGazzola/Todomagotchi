"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { configuration, isPrivatePath } from "@/configuration";
import { signOut } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthCookiesAction, getUserWithAllDataAction } from "./layout.actions";
import { useAppStore, useOrganizationStore, useTamagotchiStore } from "./layout.stores";

export const useGetUser = () => {
  const { setUser, setActiveOrganizationId, reset: resetApp } = useAppStore();
  const { setOrganizations, reset: resetOrg } = useOrganizationStore();
  const { setTamagotchi, reset: resetTama } = useTamagotchiStore();
  const pathname = usePathname();
  const router = useRouter();

  return useQuery({
    queryKey: ["user-with-all-data"],
    queryFn: async () => {
      const { data, error } = await getUserWithAllDataAction();
      if (!data || error) {
        await clearAuthCookiesAction();
        resetApp();
        resetOrg();
        resetTama();
        if (isPrivatePath(pathname)) {
          router.push(configuration.paths.signIn);
        }
      }
      if (error) throw error;

      if (data) {
        setUser(data.user);
        setOrganizations(data.organizations);
        setActiveOrganizationId(data.activeOrganizationId);
        setTamagotchi(data.activeTamagotchi);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { reset: resetApp } = useAppStore();
  const { reset: resetOrg } = useOrganizationStore();
  const { reset: resetTama } = useTamagotchiStore();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      showSuccessToast("Signed out successfully");
      queryClient.invalidateQueries({ queryKey: ["user-with-all-data"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      resetApp();
      resetOrg();
      resetTama();
      router.push(configuration.paths.signIn);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign out", "Sign Out Failed");
      queryClient.invalidateQueries({ queryKey: ["user-with-all-data"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      resetApp();
      resetOrg();
      resetTama();
      router.push(configuration.paths.signIn);
    },
  });
};
