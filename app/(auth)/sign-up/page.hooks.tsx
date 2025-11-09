"use client";

import { createOrganizationAction } from "@/app/(components)/AvatarMenu.actions";
import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { configuration } from "@/configuration";
import { organization, signUp } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { SignUpData } from "./page.types";

export const useSignUp = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (signUpData: SignUpData) => {
      if (signUpData.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const signUpResult = await signUp.email({
        email: signUpData.email,
        password: signUpData.password,
        name: signUpData.name,
      });

      if (signUpResult.error) {
        throw new Error(signUpResult.error.message || "Failed to sign up");
      }

      const slug =
        signUpData.name.toLowerCase().replace(/\s+/g, "-") + "-tasks";
      const { data, error } = await createOrganizationAction(
        `${signUpData.name}'s Tasks`,
        slug
      );

      if (error) {
        throw new Error(error);
      }

      if (data && typeof data === "object" && "id" in data) {
        await organization.setActive({ organizationId: data.id as string });
      }
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Account created successfully");
      router.push(configuration.paths.home);

      return signUpResult.data;
    },
    onSuccess: () => {},
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign up", "Sign Up Failed");
    },
  });
};
