"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TestId } from "@/test.types";
import { Mail, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useSignOut } from "../layout.hooks";
import { useAppStore, useOrganizationStore } from "../layout.stores";
import {
  useCreateOrganization,
  useGetOrganizationColor,
  useResetOrganizationData,
  useSendInvitations,
  useSetActiveOrganization,
  useUpdateTamagotchiColor,
} from "./AvatarMenu.hooks";

export function AvatarMenu() {
  const router = useRouter();
  const { user, activeOrganizationId } = useAppStore();
  const { organizations } = useOrganizationStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const { mutate: setActiveOrganization } = useSetActiveOrganization();
  const { mutate: updateColor } = useUpdateTamagotchiColor();
  const { mutate: createOrganization, isPending: isCreatingOrg } =
    useCreateOrganization();
  const { mutate: resetOrganizationData } = useResetOrganizationData();
  const { mutate: sendInvitations, isPending: isSendingInvites } =
    useSendInvitations();
  const { mutate: signOutMutation } = useSignOut();

  const { data: currentColor } = useGetOrganizationColor(activeOrganizationId);

  const [tempColor, setTempColor] = useState(currentColor || "#1f2937");

  const handleSignOut = () => {
    signOutMutation();
  };

  const handleOrganizationChange = (value: string) => {
    if (value === "__add_new__") {
      setShowCreateOrgDialog(true);
    } else {
      setActiveOrganization(value);
    }
  };

  const handleCreateOrganization = () => {
    if (!newOrgName.trim()) return;

    const slug = newOrgName.toLowerCase().replace(/\s+/g, "-");
    createOrganization(
      { name: newOrgName, slug },
      {
        onSuccess: () => {
          setNewOrgName("");
          setShowCreateOrgDialog(false);
        },
      }
    );
  };

  const handleColorChange = (color: string) => {
    setTempColor(color);
  };

  const handleColorSubmit = () => {
    updateColor(tempColor);
    setShowColorPicker(false);
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all tasks and tamagotchi data for this organization? This cannot be undone."
      )
    ) {
      resetOrganizationData();
    }
  };

  const handleSendInvitations = () => {
    if (!activeOrganizationId || !inviteEmails.trim()) return;

    const emailList = inviteEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) return;

    sendInvitations(
      {
        emails: emailList,
        role: inviteRole,
        organizationId: activeOrganizationId,
      },
      {
        onSuccess: () => {
          setInviteEmails("");
          setInviteRole("member");
          setShowInviteDialog(false);
        },
      }
    );
  };

  const hasNoOrganizations = organizations && organizations.length === 0;

  if (!user) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => router.push("/sign-in")}
          data-testid={TestId.SIGN_IN_BUTTON}
        >
          Sign In
        </Button>
      </div>
    );
  }

  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "U";

  const activeOrganization = organizations?.find(
    (org: { id: string }) => org.id === activeOrganizationId
  );

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full"
              data-testid={TestId.AVATAR_MENU_TRIGGER}
            >
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-80"
            data-testid={TestId.AVATAR_MENU_CONTENT}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p
                  className="text-sm text-muted-foreground"
                  data-testid={TestId.AVATAR_MENU_EMAIL}
                  data-email={user.email}
                >
                  {user.email}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Organization</label>
                <select
                  value={activeOrganizationId || ""}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid={TestId.AVATAR_MENU_ORG_SELECT}
                >
                  {organizations?.map((org: { id: string; name: string }) => (
                    <option
                      key={org.id}
                      value={org.id}
                    >
                      {org.name}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add New Organization</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Tamagotchi Color</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="h-10 w-10 rounded-md border-2 border-gray-300"
                    style={{ backgroundColor: currentColor }}
                    data-testid={TestId.AVATAR_MENU_COLOR_SWATCH}
                  />
                  <span className="text-xs text-muted-foreground uppercase">
                    {currentColor}
                  </span>
                </div>

                {showColorPicker && (
                  <div className="flex flex-col gap-2">
                    <HexColorPicker
                      color={tempColor}
                      onChange={handleColorChange}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleColorSubmit}
                        size="sm"
                        className="flex-1"
                      >
                        Apply
                      </Button>
                      <Button
                        onClick={() => setShowColorPicker(false)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(true)}
                className="w-full"
                disabled={!activeOrganizationId}
                data-testid={TestId.INVITE_USERS_BUTTON}
              >
                <Mail className="h-4 w-4 mr-2" />
                Invite Users
              </Button>

              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
                data-testid={TestId.AVATAR_MENU_RESET_BUTTON}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Organization Data
              </Button>

              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
                data-testid={TestId.AVATAR_MENU_SIGN_OUT}
              >
                Sign Out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={showCreateOrgDialog}>
        <DialogContent data-testid={TestId.CREATE_ORG_DIALOG}>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreatingOrg) {
                  handleCreateOrganization();
                }
              }}
              data-testid={TestId.CREATE_ORG_INPUT}
            />
          </div>
          <DialogFooter>
            {!hasNoOrganizations && (
              <Button
                variant="outline"
                onClick={() => setShowCreateOrgDialog(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim() || isCreatingOrg}
              data-testid={TestId.CREATE_ORG_SUBMIT}
            >
              {isCreatingOrg ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      >
        <DialogContent data-testid={TestId.INVITE_DIALOG}>
          <DialogHeader>
            <DialogTitle>Invite Users to {activeOrganization?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Email Addresses</label>
              <Input
                placeholder="email1@example.com, email2@example.com"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSendingInvites) {
                    handleSendInvitations();
                  }
                }}
                data-testid={TestId.INVITE_EMAIL_INPUT}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple emails with commas
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid={TestId.INVITE_ROLE_SELECT}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              data-testid={TestId.INVITE_CANCEL_BUTTON}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitations}
              disabled={!inviteEmails.trim() || isSendingInvites}
              data-testid={TestId.INVITE_SEND_BUTTON}
            >
              {isSendingInvites ? "Sending..." : "Send Invitations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
