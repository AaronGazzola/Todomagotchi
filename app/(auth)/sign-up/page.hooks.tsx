"use client";

import { showErrorToast } from "@/app/(components)/Toast";
import { signUp } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SignUpData } from "./page.types";

export const useSignUp = () => {
  const queryClient = useQueryClient();

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

      queryClient.invalidateQueries({ queryKey: ["user"] });

      return signUpResult.data;
    },
    onSuccess: () => {},
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign up", "Sign Up Failed");
    },
  });
};
