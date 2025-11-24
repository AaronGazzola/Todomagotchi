"use client";

import { organization } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showErrorToast, showSuccessToast } from "./Toast";
import {
  acceptInvitationAction,
  createOrganizationAction,
  declineInvitationAction,
  getPendingInvitationsForUserAction,
  getUserOrganizationsAction,
  resetOrganizationDataAction,
  sendInvitationsAction,
  setActiveOrganizationAction,
  updateTamagotchiColorAction,
} from "./AvatarMenu.actions";
import { InvitationResult, SendInvitationsParams } from "./AvatarMenu.types";
import { useOrganizationStore, useAppStore, useTamagotchiStore } from "@/app/layout.stores";
import { useActiveOrganizationId } from "@/app/layout.hooks";
import { OrganizationWithTamagotchi } from "@/app/layout.types";
import { getUserWithAllDataAction } from "@/app/layout.actions";
import { getTodosAction } from "@/app/page.actions";
import { getTamagotchiAction } from "./Tamagotchi.actions";
import { useMessageStore, useTodoStore } from "@/app/page.stores";


export const useSetActiveOrganization = () => {
  const queryClient = useQueryClient();
  const { reset: resetMessages } = useMessageStore();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await organization.setActive({ organizationId });
      return organizationId;
    },
    onSuccess: () => {
      resetMessages();
      queryClient.invalidateQueries({ queryKey: ["user-with-all-data"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      showSuccessToast("Organization switched");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to switch organization", "Switch Failed");
    },
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAppStore();
  const { setOrganizations } = useOrganizationStore();
  const { setTamagotchi } = useTamagotchiStore();
  const { setTodos } = useTodoStore();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await createOrganizationAction(name, slug);
      if (error) throw new Error(error);

      if (data?.id) {
        await organization.setActive({ organizationId: data.id });

        const [
          { data: allData },
          { data: todos },
          { data: tamagotchi }
        ] = await Promise.all([
          getUserWithAllDataAction(),
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
      }

      return data as { id: string } | null;
    },
    onSuccess: async () => {
      showSuccessToast("Organization created successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to create organization", "Creation Failed");
    },
  });
};

export const useGetOrganizationColor = (organizationId: string | null) => {
  const { organizations } = useOrganizationStore();

  const org = organizations.find((o) => o.id === organizationId);
  const color = org?.tamagotchi?.color || "#1f2937";

  return { data: color };
};

export const useUpdateTamagotchiColor = () => {
  const queryClient = useQueryClient();
  const { tamagotchi, setTamagotchi } = useTamagotchiStore();
  const activeOrganizationId = useActiveOrganizationId();
  const { organizations, setOrganizations } = useOrganizationStore();

  return useMutation({
    mutationFn: async (color: string) => {
      const { error } = await updateTamagotchiColorAction(color);
      if (error) throw new Error(error);
      return color;
    },
    onSuccess: (color) => {
      if (tamagotchi) {
        const updatedTamagotchi = { ...tamagotchi, color };
        setTamagotchi(updatedTamagotchi);

        const updatedOrgs = organizations.map((org) =>
          org.id === activeOrganizationId
            ? { ...org, tamagotchi: updatedTamagotchi }
            : org
        );
        setOrganizations(updatedOrgs);
      }

      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["organization-color"] });
      showSuccessToast("Tamagotchi color updated");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update color", "Update Failed");
    },
  });
};

export const useResetOrganizationData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await resetOrganizationDataAction();
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      showSuccessToast("Organization data reset successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to reset data", "Reset Failed");
    },
  });
};

export const useSendInvitations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendInvitationsParams) => {
      const { data, error } = await sendInvitationsAction(params);
      if (error) throw new Error(error);
      return data as InvitationResult[];
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        showSuccessToast(
          `${successCount} invitation${successCount === 1 ? "" : "s"} sent successfully`
        );
      }

      if (failCount > 0) {
        const failedEmails = results
          .filter((r) => !r.success)
          .map((r) => `${r.email}: ${r.error}`)
          .join(", ");
        showErrorToast(failedEmails, "Some invitations failed");
      }
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to send invitations", "Invitation Failed");
    },
  });
};

export const useGetPendingInvitations = () => {
  return useQuery({
    queryKey: ["pending-invitations"],
    queryFn: async () => {
      const { data, error } = await getPendingInvitationsForUserAction();
      if (error) throw new Error(error);
      return data || [];
    },
    refetchInterval: 5000,
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await acceptInvitationAction(invitationId);
      if (error) throw new Error(error);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["user-with-all-data"] });
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["tamagotchi"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      showSuccessToast("Invitation accepted successfully");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to accept invitation", "Accept Failed");
    },
  });
};

export const useDeclineInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await declineInvitationAction(invitationId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      showSuccessToast("Invitation declined");
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to decline invitation", "Decline Failed");
    },
  });
};
