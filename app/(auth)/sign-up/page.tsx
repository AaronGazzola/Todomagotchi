"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TestId } from "@/test.types";
import { useSignUp } from "./page.hooks";
import { useCreateOrganization } from "@/app/(components)/AvatarMenu.hooks";
import { configuration } from "@/configuration";
import { Eye, EyeOff, Info } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: signUpUser, isPending: isSigningUp } = useSignUp();
  const { mutate: createOrganization, isPending: isCreatingOrg } = useCreateOrganization();

  const isLoading = isSigningUp || isCreatingOrg;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signUpUser(
      { name, email, password },
      {
        onSuccess: () => {
          const slug = name.toLowerCase().replace(/\s+/g, "-") + "-tasks";
          createOrganization(
            { name: `${name}'s Tasks`, slug },
            {
              onSuccess: () => {
                router.push(configuration.paths.home);
              },
            }
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign Up</h1>
          <p className="text-muted-foreground mt-2">
            Create an account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_UP_NAME}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>You can sign in with a fake email address!</span>
            </div>
            <Input
              id="email"
              type="email"
              placeholder="demo@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_UP_EMAIL}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                data-testid={TestId.SIGN_UP_PASSWORD}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                data-testid={TestId.SIGN_UP_PASSWORD_TOGGLE}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid={TestId.SIGN_UP_SUBMIT}
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link
              href="/sign-in"
              className="font-medium underline underline-offset-4 hover:text-primary"
              data-testid={TestId.SIGN_IN_LINK}
            >
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
