import { createAuthClient } from "better-auth/client";
import {
  adminClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [magicLinkClient(), adminClient(), organizationClient()],
});

export const {
  signIn,
  useSession,
  getSession,
  signUp,
  organization,
  admin,
  signOut,
} = authClient;
