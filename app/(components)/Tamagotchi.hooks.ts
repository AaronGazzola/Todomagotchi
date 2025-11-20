"use client";

import { useActiveOrganizationId } from "@/app/layout.hooks";
import { useTamagotchiStore } from "@/app/layout.stores";
import { conditionalLog, LOG_LABELS } from "@/lib/log.util";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  feedTamagotchiAction,
  getTamagotchiAction,
  updateTamagotchiAgeAction,
  updateTamagotchiHungerAction,
  updateTamagotchiSpeciesAction,
} from "./Tamagotchi.actions";
import { showErrorToast, showSuccessToast } from "./Toast";

export const useGetTamagotchi = () => {
  const { setTamagotchi } = useTamagotchiStore();
  const activeOrganizationId = useActiveOrganizationId();

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
    refetchInterval: 5000,
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
      conditionalLog(
        { message: "feedTamagotchiAction - start" },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      const { data, error } = await feedTamagotchiAction();
      conditionalLog(
        {
          message: "feedTamagotchiAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      conditionalLog(
        { message: "useFeedTamagotchi - onSuccess", data },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
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
      conditionalLog(
        { message: "useFeedTamagotchi - onError", error: error.message },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
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
      conditionalLog(
        { message: "updateTamagotchiHungerAction - start" },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      const { data, error } = await updateTamagotchiHungerAction();
      conditionalLog(
        {
          message: "updateTamagotchiHungerAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      conditionalLog(
        { message: "useUpdateTamagotchiHunger - onSuccess", data },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
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
      conditionalLog(
        { message: "updateTamagotchiSpeciesAction - start", species },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      const { data, error } = await updateTamagotchiSpeciesAction(species);
      conditionalLog(
        {
          message: "updateTamagotchiSpeciesAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      conditionalLog(
        { message: "useUpdateTamagotchiSpecies - onSuccess", data },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      if (data) {
        setTamagotchi(data);
      }
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Species updated!");
    },
    onError: (error: Error) => {
      conditionalLog(
        {
          message: "useUpdateTamagotchiSpecies - onError",
          error: error.message,
        },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
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
      conditionalLog(
        { message: "updateTamagotchiAgeAction - start", age },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      const { data, error } = await updateTamagotchiAgeAction(age);
      conditionalLog(
        {
          message: "updateTamagotchiAgeAction - result",
          hasData: !!data,
          error: error || null,
          data,
        },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data) => {
      conditionalLog(
        { message: "useUpdateTamagotchiAge - onSuccess", data },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      if (data) {
        setTamagotchi(data);
      }
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      showSuccessToast("Age updated!");
    },
    onError: (error: Error) => {
      conditionalLog(
        { message: "useUpdateTamagotchiAge - onError", error: error.message },
        { label: LOG_LABELS.TAMAGOTCHI_HOOKS }
      );
      showErrorToast(error.message || "Failed to update age", "Update Failed");
    },
  });
};
