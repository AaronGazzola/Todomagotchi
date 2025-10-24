"use client";

import { organization } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createOrganizationAction,
  getOrganizationTamagotchiColorAction,
  getUserOrganizationsAction,
  updateTamagotchiColorAction,
} from "./AvatarMenu.actions";

export const useGetUserOrganizations = () => {
  return useQuery({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const { data, error } = await getUserOrganizationsAction();
      if (error) throw new Error(error);
      return (data as Array<{ id: string; name: string }>) || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSetActiveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await organization.setActive({ organizationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      toast.success("Organization switched");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch organization");
    },
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await createOrganizationAction(name, slug);
      if (error) throw new Error(error);
      return data as { id: string } | null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["todos"] });
        queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      }
      toast.success("Organization created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create organization");
    },
  });
};

export const useGetOrganizationColor = (organizationId: string | null) => {
  return useQuery({
    queryKey: ["organization-color", organizationId],
    queryFn: async () => {
      if (!organizationId) return "#1f2937";
      const { data, error } =
        await getOrganizationTamagotchiColorAction(organizationId);
      if (error) throw new Error(error);
      return data || "#1f2937";
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
};

export const useUpdateTamagotchiColor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (color: string) => {
      const { error } = await updateTamagotchiColorAction(color);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["organization-color"] });
      toast.success("Tamagotchi color updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update color");
    },
  });
};
