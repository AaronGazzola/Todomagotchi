"use client";

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

      const slug = signUpData.name.toLowerCase().replace(/\s+/g, "-") + "-tasks";
      const orgResult = await organization.create({
        name: `${signUpData.name}'s Tasks`,
        slug,
      });

      if (orgResult.error) {
        showErrorToast("Account created but failed to create organization");
      } else if (orgResult.data) {
        await organization.setActive({ organizationId: orgResult.data.id });
      }

      return signUpResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      showSuccessToast("Account created successfully");
      router.push(configuration.paths.home);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign up", "Sign Up Failed");
    },
  });
};
