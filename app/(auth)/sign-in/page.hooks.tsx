"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { configuration } from "@/configuration";
import { signIn } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { SignInData } from "./page.types";
import { getUserOrganizationsAction, setActiveOrganizationAction } from "@/app/(components)/AvatarMenu.actions";
import { useAppStore, useOrganizationStore, useTamagotchiStore } from "@/app/layout.stores";
import { getUserWithAllDataAction } from "@/app/layout.actions";
import { getTodosAction } from "@/app/page.actions";
import { getTamagotchiAction } from "@/app/(components)/Tamagotchi.actions";
import { useTodoStore } from "@/app/page.stores";

export const useSignIn = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setUser } = useAppStore();
  const { setOrganizations } = useOrganizationStore();
  const { setTamagotchi } = useTamagotchiStore();
  const { setTodos } = useTodoStore();

  return useMutation({
    mutationFn: async (signInData: SignInData) => {
      const result = await signIn.email({
        email: signInData.email,
        password: signInData.password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to sign in");
      }

      const { data: organizations } = await getUserOrganizationsAction();
      if (organizations && Array.isArray(organizations) && organizations.length > 0) {
        const { error } = await setActiveOrganizationAction(organizations[0].id);
        if (error) throw new Error(error);
      }

      const { data: allData } = await getUserWithAllDataAction();

      const [
        { data: todos },
        { data: tamagotchi }
      ] = await Promise.all([
        getTodosAction(),
        getTamagotchiAction()
      ]);

      if (allData) {
        setUser(allData.user);
        setOrganizations(allData.organizations);
        setTamagotchi(allData.activeTamagotchi);
        queryClient.setQueryData(["user-with-all-data"], allData);
      }

      if (todos) {
        setTodos(todos);
        queryClient.setQueryData(["todos"], todos);
      }

      if (tamagotchi) {
        setTamagotchi(tamagotchi);
        queryClient.setQueryData(["tamagotchi"], tamagotchi);
      }

      showSuccessToast("Signed in successfully");
      router.push(configuration.paths.home);

      return allData;
    },
    onSuccess: () => {
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign in", "Sign In Failed");
    },
  });
};
