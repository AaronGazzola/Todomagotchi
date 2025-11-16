"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  feedTamagotchiAction,
  getTamagotchiAction,
  updateTamagotchiHungerAction,
  updateTamagotchiSpeciesAction,
  updateTamagotchiAgeAction,
} from "./Tamagotchi.actions";
import { showErrorToast, showSuccessToast } from "./Toast";
import { useTamagotchiStore, useAppStore } from "@/app/layout.stores";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";

export const useGetTamagotchi = () => {
  const { setTamagotchi } = useTamagotchiStore();
  const { activeOrganizationId } = useAppStore();

  const query = useQuery({
    queryKey: ["tamagotchi"],
    queryFn: async () => {
      conditionalLog(
        {
          message: "getTamagotchiAction - start",
          activeOrganizationId,
        },
        { label: LOG_LABELS.TAMAGOTCHI }
      );
      const { data, error } = await getTamagotchiAction();
      conditionalLog(
        {
          message: "getTamagotchiAction - result",
          hasData: !!data,
          error: error || null,
          tamagotchi: data || null,
        },
        { label: LOG_LABELS.TAMAGOTCHI }
      );
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!activeOrganizationId,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) {
      setTamagotchi(query.data);
      conditionalLog(
        {
          message: "tamagotchi store updated",
          tamagotchi: query.data,
        },
        { label: LOG_LABELS.TAMAGOTCHI }
      );
    }
  }, [query.data, setTamagotchi]);

  conditionalLog(
    {
      message: "useGetTamagotchi - query state",
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isEnabled: !!activeOrganizationId,
      hasData: !!query.data,
    },
    { label: LOG_LABELS.TAMAGOTCHI }
  );

  return query;
};

export const useFeedTamagotchi = () => {
  const queryClient = useQueryClient();
  const { setTamagotchi } = useTamagotchiStore();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await feedTamagotchiAction();
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setTamagotchi(data);
      }
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

export const useUpdateTamagotchiHunger = () => {
  const queryClient = useQueryClient();
  const { setTamagotchi } = useTamagotchiStore();

  return useMutation({
    mutationFn: async () => {
      console.log("timer mutationa");
      const { data, error } = await updateTamagotchiHungerAction();
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setTamagotchi(data);
      }
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
    },
  });
};

export const useHungerTimer = () => {
  const { mutate: updateHunger } = useUpdateTamagotchiHunger();

  useEffect(() => {
    updateHunger();

    console.log("setting interval");

    const interval = setInterval(() => {
      console.log("interval");
      updateHunger();
    }, 30000);

    return () => clearInterval(interval);
  }, [updateHunger]);
};

export const useUpdateTamagotchiSpecies = () => {
  const queryClient = useQueryClient();
  const { setTamagotchi } = useTamagotchiStore();

  return useMutation({
    mutationFn: async (species: string) => {
      const { data, error } = await updateTamagotchiSpeciesAction(species);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setTamagotchi(data);
      }
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Species updated!");
    },
    onError: (error: Error) => {
      showErrorToast(
        error.message || "Failed to update species",
        "Update Failed"
      );
    },
  });
};

export const useUpdateTamagotchiAge = () => {
  const queryClient = useQueryClient();
  const { setTamagotchi } = useTamagotchiStore();

  return useMutation({
    mutationFn: async (age: number) => {
      const { data, error } = await updateTamagotchiAgeAction(age);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setTamagotchi(data);
      }
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Age updated!");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update age", "Update Failed");
    },
  });
};
