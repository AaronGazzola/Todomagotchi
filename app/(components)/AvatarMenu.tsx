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
import { useSession } from "@/lib/auth-client";
import { TestId } from "@/test.types";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useSignOut } from "../layout.hooks";
import {
  useCreateOrganization,
  useGetOrganizationColor,
  useGetUserOrganizations,
  useResetOrganizationData,
  useSetActiveOrganization,
  useUpdateTamagotchiColor,
} from "./AvatarMenu.hooks";

export function AvatarMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const { data: organizations } = useGetUserOrganizations();
  const { mutate: setActiveOrganization } = useSetActiveOrganization();
  const { mutate: updateColor } = useUpdateTamagotchiColor();
  const { mutate: createOrganization, isPending: isCreatingOrg } =
    useCreateOrganization();
  const { mutate: resetOrganizationData } = useResetOrganizationData();
  const { mutate: signOutMutation } = useSignOut();

  const activeOrganizationId = session?.session?.activeOrganizationId ?? null;
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

  const hasNoOrganizations = organizations && organizations.length === 0;

  if (!session?.user) {
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
    session.user.name
      ?.split(" ")
      .map((n) => n[0])
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
                >
                  {session.user.email}
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
    </>
  );
}
