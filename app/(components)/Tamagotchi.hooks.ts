"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { feedTamagotchiAction, getTamagotchiAction } from "./Tamagotchi.actions";

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
        toast.success("Your Tamagotchi has evolved back to an egg!");
      } else if (
        data?.feedCount === 10 ||
        data?.feedCount === 20 ||
        data?.feedCount === 30
      ) {
        const ageNames = ["egg", "baby", "child", "adult"];
        toast.success(`Your Tamagotchi grew to ${ageNames[data.age]}!`);
      } else {
        toast.success("Fed your Tamagotchi!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to feed Tamagotchi");
    },
  });
};
