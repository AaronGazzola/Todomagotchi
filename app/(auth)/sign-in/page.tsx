"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TestId } from "@/test.types";
import { useSession } from "@/lib/auth-client";
import { useSignIn } from "./page.hooks";
import { Info } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate: signInUser, isPending: isLoading } = useSignIn();

  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInUser({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground mt-2">
            Enter your credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              data-testid={TestId.SIGN_IN_EMAIL}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              data-testid={TestId.SIGN_IN_PASSWORD}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid={TestId.SIGN_IN_SUBMIT}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{" "}
            </span>
            <Link
              href="/sign-up"
              className="font-medium underline underline-offset-4 hover:text-primary"
              data-testid={TestId.SIGN_UP_LINK}
            >
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
