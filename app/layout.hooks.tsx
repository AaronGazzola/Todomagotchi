"use client";

import { showErrorToast, showSuccessToast } from "@/app/(components)/Toast";
import { configuration, isPrivatePath } from "@/configuration";
import { signOut } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { getUserAction } from "./layout.actions";
import { useAppStore } from "./layout.stores";

export const useGetUser = () => {
  const { setUser, reset } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data, error } = await getUserAction();
      if (!data || error) {
        if (isPrivatePath(pathname)) {
          router.push(configuration.paths.signIn);
        }
        reset();
      }
      if (error) throw error;
      setUser(data ?? null);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { reset } = useAppStore();

  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      showSuccessToast("Signed out successfully");
      queryClient.invalidateQueries();
      reset();
      router.push(configuration.paths.signIn);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to sign out", "Sign Out Failed");
      queryClient.invalidateQueries();
      reset();
      router.push(configuration.paths.signIn);
    },
  });
};
