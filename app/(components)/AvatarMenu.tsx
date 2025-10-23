"use client";

import { User } from "@/app/page.types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TestId } from "@/test.types";
import { useState } from "react";

const mockUser: User = {
  name: "Demo User",
  email: "demo@example.com",
};

export function AvatarMenu() {
  const [isSignedIn, setIsSignedIn] = useState(true);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
  };

  const handleSignIn = () => {
    setIsSignedIn(true);
  };

  if (!isSignedIn) {
    return (
      <div
        className="fixed top-4 right-4 z-50"
        data-testid={TestId.AVATAR_MENU}
      >
        <Button
          onClick={handleSignIn}
          data-testid={TestId.SIGN_IN_BUTTON}
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed top-4 right-4 z-50"
      data-testid={TestId.AVATAR_MENU}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
            data-testid={TestId.AVATAR_MENU_TRIGGER}
          >
            <Avatar>
              <AvatarFallback>{getInitials(mockUser.name)}</AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 bg-black"
          align="end"
          data-testid={TestId.AVATAR_MENU_CONTENT}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{mockUser.name}</p>
              <p
                className="text-sm text-muted-foreground"
                data-testid={TestId.AVATAR_MENU_EMAIL}
              >
                {mockUser.email}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              data-testid={TestId.AVATAR_MENU_SIGN_OUT}
            >
              Sign Out
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
