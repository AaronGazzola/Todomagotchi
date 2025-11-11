"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useGetPendingInvitations,
} from "./AvatarMenu.hooks";
import { PendingInvitation } from "./AvatarMenu.types";
import { useInvitationSSE } from "./AvatarMenu.sse";
import { TestId } from "@/test.types";
import { useSession } from "@/lib/auth-client";

export function InvitationToasts() {
  const { data: session } = useSession();
  useInvitationSSE(!!session?.user?.email);

  const { data: invitations } = useGetPendingInvitations();
  const { mutate: acceptInvitation } = useAcceptInvitation();
  const { mutate: declineInvitation } = useDeclineInvitation();

  const displayedInvitationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!invitations || invitations.length === 0) return;

    invitations.forEach((invitation: PendingInvitation) => {
      if (displayedInvitationsRef.current.has(invitation.id)) return;

      displayedInvitationsRef.current.add(invitation.id);

      toast.custom(
        (t) => (
          <div
            className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg min-w-[320px] max-w-[420px]"
            data-testid={TestId.INVITATION_TOAST}
            data-org-name={invitation.organization.name}
            data-role={invitation.role}
          >
            <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-blue-900 text-sm">
                Organization Invitation
              </div>
              <div className="text-blue-700 text-sm mt-0.5">
                {invitation.inviter.name || invitation.inviter.email} invited
                you to join <strong>{invitation.organization.name}</strong> as a{" "}
                <strong>{invitation.role}</strong>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    acceptInvitation(invitation.id);
                    toast.dismiss(t);
                  }}
                  className="flex-1"
                  data-testid={TestId.INVITATION_ACCEPT_BUTTON}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    declineInvitation(invitation.id);
                    toast.dismiss(t);
                  }}
                  className="flex-1"
                  data-testid={TestId.INVITATION_DECLINE_BUTTON}
                >
                  Decline
                </Button>
              </div>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          id: `invitation-${invitation.id}`,
        }
      );
    });
  }, [invitations, acceptInvitation, declineInvitation]);

  return null;
}
