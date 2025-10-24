"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  feedTamagotchiAction,
  getTamagotchiAction,
} from "./Tamagotchi.actions";
import { showErrorToast, showSuccessToast } from "./Toast";

export const useGetTamagotchi = () => {
  return useQuery({
    queryKey: ["tamagotchi"],
    queryFn: async () => {
      const { data, error } = await getTamagotchiAction();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 1000 * 60,
  });
};

export const useFeedTamagotchi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await feedTamagotchiAction();
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });

      if (data?.age === 0 && data?.feedCount === 0) {
        showSuccessToast("Your Tamagotchi has evolved back to an egg!");
      } else if (
        data?.feedCount === 10 ||
        data?.feedCount === 20 ||
        data?.feedCount === 30
      ) {
        const ageNames = ["egg", "baby", "child", "adult"];
        showSuccessToast(`Your Tamagotchi grew to ${ageNames[data.age]}!`);
      } else {
        showSuccessToast("Fed your Tamagotchi!");
      }
    },
    onError: (error: Error) => {
      showErrorToast(
        error.message || "Failed to feed Tamagotchi",
        "Feed Failed"
      );
    },
  });
};
