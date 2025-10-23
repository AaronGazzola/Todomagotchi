# File examples:

## Types file example:

```typescript
import { User } from "@prisma/client";

export interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  tempEmail?: string;
  setTempEmail: (tempEmail: string) => void;
  reset: () => void;
}

export interface SignInData {
  email: string;
  password: string;
}
```

## Stores file example:

```typescript
import { UserRole } from "@prisma/client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState, ExtendedUser, RedirectState } from "./layout.types";

const initialState = {
  user: null,
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,
  setUser: (user) => set({ user, profile: user?.profile || null }),
  reset: () => set(initialState),
}));
```

## Actions file example:

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { User } from "@prisma/client";
import { headers } from "next/headers";

export const getUserAction = async (): Promise<ActionResponse<User | null>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse();

    const { db } = await getAuthenticatedClient();

    const prismaUser = await db.user.findUnique({
      where: { id: session.user.id },
    });

    return getActionResponse({ data: prismaUser });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

# Hooks file example

```typescript
"use client";

import { configuration, privatePaths } from "@/configuration";
import { signIn } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Toast } from "../(components)/Toast";
import { CypressDataAttributes } from "../../types/cypress.types";
import { useAppStore, useRedirectStore } from "../layout.stores";
import { SignInData } from "../layout.types";
import { getUserAction } from "./layout.actions";
import { useAuthLayoutStore } from "./layout.stores";

export const useGetUser = () => {
  const { setUser, reset } = useAppStore();
  const { reset: resetAuthLayout } = useAuthLayoutStore();
  const { setUserData } = useRedirectStore();
  const pathname = usePathname();

  const router = useRouter();
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data, error } = await getUserAction();
      if (!data || error) {
        if (privatePaths.includes(pathname)) {
          router.push(configuration.paths.signIn);
        }
        reset();
        resetAuthLayout();
      }
      if (error) throw error;
      setUser(data ?? null);

      setUserData(data);

      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSignIn = () => {
  const { setUser, setTempEmail } = useAppStore();
  const { setUserData } = useRedirectStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async (signInData: SignInData) => {
      const { error } = await signIn.email({
        email: signInData.email,
        password: signInData.password,
      });

      if (error?.status === 403) setTempEmail(signInData.email);

      if (error) throw error;
      const { data: userData, error: userError } = await getUserAction();

      if (userError) throw new Error(userError);

      return userData;
    },
    onSuccess: (data) => {
      if (data) {
        setUser(data);
        setUserData(data);
      }
      toast.custom(() => (
        <Toast
          variant="success"
          title="Success"
          message="Successfully signed in"
          data-cy={CypressDataAttributes.TOAST_SUCCESS}
        />
      ));
      if (data && !data.profile?.isOnboardingComplete) {
        router.push(configuration.paths.onboarding);
        return;
      }
      router.push(configuration.paths.home);
    },
    onError: (
      error: {
        code?: string | undefined;
        message?: string | undefined;
        status: number;
        statusText: string;
      } | null
    ) => {
      if (error?.status === 403) return;
      toast.custom(() => (
        <Toast
          variant="error"
          title="Sign In Failed"
          message={error?.message || "Failed to sign in"}
          data-cy={CypressDataAttributes.TOAST_ERROR}
        />
      ));
    },
  });
};
```

# Better Auth Organization & Role Management

## Database Schema - `schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["auth", "public"]
}

model user {
  id               String       @id @default(cuid())
  email            String       @unique
  name             String?
  role             String       @default("user")
  banned           Boolean      @default(false)
  banReason        String?
  banExpires       DateTime?
  emailVerified    Boolean?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  image            String?
  MagicLink        MagicLink[]
  account          account[]
  invitation       invitation[]
  member           member[]
  session          session[]

  @@schema("auth")
}

model session {
  id                   String   @id @default(cuid())
  userId               String
  expiresAt            DateTime
  token                String   @unique
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  ipAddress            String?
  userAgent            String?
  impersonatedBy       String?
  activeOrganizationId String?
  user                 user     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@schema("auth")
}

model account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  user      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@schema("auth")
}

model verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
  @@schema("auth")
}

model MagicLink {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  email     String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      user     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@schema("auth")
}

model organization {
  id         String       @id @default(cuid())
  name       String
  slug       String       @unique
  logo       String?
  metadata   Json?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  invitation invitation[]
  member     member[]

  @@schema("auth")
}

model member {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           String       @default("member")
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  organization   organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           user         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@schema("auth")
}

model invitation {
  id             String       @id @default(cuid())
  organizationId String
  email          String
  role           String       @default("member")
  inviterId      String
  token          String?      @unique
  status         String       @default("pending")
  expiresAt      DateTime
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  user           user         @relation(fields: [inviterId], references: [id], onDelete: Cascade)
  organization   organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([email, organizationId])
  @@schema("auth")
}
```

## Email Templates - `lib/emails/`

### `lib/emails/MagicLinkEmail.tsx`

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface MagicLinkEmailProps {
  url: string;
}

export const MagicLinkEmail = ({ url }: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Sign in to your account</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>Sign in to your account</Text>
          <Text style={text}>Click the button below to sign in:</Text>
          <Button style={button} href={url}>
            Sign In
          </Button>
          <Text style={footer}>
            This link will expire in 5 minutes. If you didn't request this
            email, please ignore it.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const section = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#000000",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#000000",
};

const button = {
  backgroundColor: "#007cba",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "16px 0",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  marginTop: "24px",
};
```

### `lib/emails/InvitationMagicLinkEmail.tsx`

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InvitationMagicLinkEmailProps {
  url: string;
  organizationName: string;
  inviterName: string;
  role: string;
}

export const InvitationMagicLinkEmail = ({
  url,
  organizationName,
  inviterName,
  role,
}: InvitationMagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>{`You've been invited to join ${organizationName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>
            You've been invited to join {organizationName}
          </Text>
          <Text style={text}>
            {inviterName} has invited you to join their organization as a{" "}
            <strong>{role === "admin" ? "Organization Admin" : "Member"}</strong>
            .
          </Text>
          <Text style={text}>
            Click the button below to accept the invitation and sign in:
          </Text>
          <Button style={button} href={url}>
            Accept Invitation & Sign In
          </Button>
          <Text style={footer}>
            This invitation link will expire in 5 minutes. If you didn't expect
            this invitation, please ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const section = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#000000",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#000000",
};

const button = {
  backgroundColor: "#007cba",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "16px 0",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  marginTop: "24px",
};
```

### `lib/emails/OrganizationInvitationEmail.tsx`

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface OrganizationInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
}

export const OrganizationInvitationEmail = ({
  organizationName,
  inviterName,
  invitationUrl,
}: OrganizationInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>{`You've been invited to join ${organizationName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={section}>
          <Text style={heading}>
            You've been invited to join {organizationName}
          </Text>
          <Text style={text}>
            {inviterName} has invited you to join their organization.
          </Text>
          <Text style={text}>
            Click the button below to accept the invitation and sign in:
          </Text>
          <Button style={button} href={invitationUrl}>
            Accept Invitation & Sign In
          </Button>
          <Text style={footer}>
            This invitation link will expire soon. If you didn't expect this
            invitation, please ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const section = {
  padding: "0 48px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#000000",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#000000",
};

const button = {
  backgroundColor: "#007cba",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "16px 0",
};

const footer = {
  color: "#666666",
  fontSize: "14px",
  marginTop: "24px",
};
```

## Server Configuration - `lib/auth.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { render } from "@react-email/components";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, magicLink, organization } from "better-auth/plugins";
import { Resend } from "resend";
import { InvitationMagicLinkEmail } from "./emails/InvitationMagicLinkEmail";
import { MagicLinkEmail } from "./emails/MagicLinkEmail";
import { OrganizationInvitationEmail } from "./emails/OrganizationInvitationEmail";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        const callbackUrl = urlParams.get("callbackURL") || "";
        const invitationParam = new URLSearchParams(
          callbackUrl.split("?")[1]
        )?.get("invitation");

        let isInvitation = false;
        let invitationData = null;

        if (invitationParam) {
          try {
            invitationData = JSON.parse(decodeURIComponent(invitationParam));
            isInvitation = true;
          } catch {}
        }

        if (isInvitation && invitationData) {
          const html = await render(
            InvitationMagicLinkEmail({
              url,
              organizationName: invitationData.organizationName,
              inviterName: invitationData.inviterName,
              role: invitationData.role,
            })
          );

          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: email,
            subject: `You've been invited to join ${invitationData.organizationName}`,
            html,
          });
        } else {
          const html = await render(MagicLinkEmail({ url }));

          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: email,
            subject: "Sign in to your account",
            html,
          });
        }
      },
      expiresIn: 300,
      disableSignUp: false,
    }),
    admin(),
    organization({
      sendInvitationEmail: async (data) => {
        const { email, organization, inviter, invitation } = data;
        const invitationId = invitation.id;
        const invitationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/accept-invitation?invitationId=${invitationId}`;

        const html = await render(
          OrganizationInvitationEmail({
            organizationName: organization.name,
            inviterName: inviter.user.name || inviter.user.email,
            invitationUrl,
          })
        );

        await resend.emails.send({
          from: process.env.FROM_EMAIL || "noreply@example.com",
          to: email,
          subject: `You've been invited to join ${organization.name}`,
          html,
        });
      },
    }),
  ],
});
```

## Client Configuration - `lib/auth-client.ts`

```typescript
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
```

## Organization Management Actions

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";

export const createOrganizationAction = async (
  name: string,
  slug: string
): Promise<ActionResponse<unknown>> => {
  try {
    const result = await auth.api.createOrganization({
      body: { name, slug },
      headers: await headers(),
    });

    return getActionResponse({ data: result });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const listOrganizationsAction = async (): Promise<ActionResponse<unknown>> => {
  try {
    const organizations = await auth.api.listOrganizations({
      headers: await headers(),
    });

    return getActionResponse({ data: organizations });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getOrganizationAction = async (
  organizationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    const organization = await auth.api.getFullOrganization({
      query: { organizationId },
      headers: await headers(),
    });

    return getActionResponse({ data: organization });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const updateOrganizationAction = async (
  organizationId: string,
  name: string,
  slug: string
): Promise<ActionResponse<unknown>> => {
  try {
    await auth.api.updateOrganization({
      body: { organizationId, name, slug },
      headers: await headers(),
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const deleteOrganizationAction = async (
  organizationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    await auth.api.deleteOrganization({
      body: { organizationId },
      headers: await headers(),
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## Invitation Management Actions

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";

export const createInvitationAction = async (
  email: string,
  organizationId: string,
  role: string
): Promise<ActionResponse<unknown>> => {
  try {
    await auth.api.createInvitation({
      body: { email, organizationId, role },
      headers: await headers(),
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const acceptInvitationAction = async (
  invitationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    await auth.api.acceptInvitation({
      body: { invitationId },
      headers: await headers(),
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getPendingInvitationsForUserAction = async (): Promise<
  ActionResponse<unknown[]>
> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse({ data: [] });

    const { db } = await getAuthenticatedClient();

    const invitations = await db.invitation.findMany({
      where: {
        email: session.user.email,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: true,
        user: true,
      },
    });

    return getActionResponse({ data: invitations });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const declineInvitationAction = async (
  invitationId: string
): Promise<ActionResponse<unknown>> => {
  try {
    const { db } = await getAuthenticatedClient();

    await db.invitation.update({
      where: { id: invitationId },
      data: { status: "declined" },
    });

    return getActionResponse();
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## Organization Management Hooks

```typescript
"use client";

import { organization } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createOrganizationAction,
  deleteOrganizationAction,
  listOrganizationsAction,
  updateOrganizationAction,
} from "./organization.actions";

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await createOrganizationAction(name, slug);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create organization");
    },
  });
};

export const useListOrganizations = () => {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await listOrganizationsAction();
      if (error) throw new Error(error);
      return data;
    },
  });
};

export const useSetActiveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      await organization.setActive(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Active organization updated");
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      name,
      slug,
    }: {
      organizationId: string;
      name: string;
      slug: string;
    }) => {
      const { error } = await updateOrganizationAction(organizationId, name, slug);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated successfully");
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await deleteOrganizationAction(organizationId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization deleted successfully");
    },
  });
};
```

## Invitation Management Hooks

```typescript
"use client";

import { organization } from "@/lib/auth-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acceptInvitationAction,
  declineInvitationAction,
  getPendingInvitationsForUserAction,
} from "./invitation.actions";

export const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      organizationId,
    }: {
      email: string;
      role: string;
      organizationId: string;
    }) => {
      await organization.inviteMember({ email, role, organizationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      toast.success("Invitation sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send invitation");
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
    refetchInterval: 1000 * 60 * 2,
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await acceptInvitationAction(invitationId);
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Successfully joined the organization");
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
      toast.success("Invitation declined");
    },
  });
};
```

## Role-Based Access Control

```typescript
"use server";

import { ActionResponse, getActionResponse } from "@/lib/action.utils";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import { headers } from "next/headers";

export const checkUserAccessAction = async (
  organizationId: string
): Promise<
  ActionResponse<{
    hasAccess: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    role: string | null;
  }>
> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return getActionResponse({
        data: { hasAccess: false, isAdmin: false, isOwner: false, role: null },
      });
    }

    const isSuperAdmin = session.user.role === "super-admin";

    const { db } = await getAuthenticatedClient();

    const membership = await db.member.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    });

    const isAdmin = membership?.role === "admin" || membership?.role === "owner";

    return getActionResponse({
      data: {
        hasAccess: isSuperAdmin || !!membership,
        isAdmin: isSuperAdmin || isAdmin,
        isOwner: membership?.role === "owner",
        role: membership?.role || null,
      },
    });
  } catch (error) {
    return getActionResponse({ error });
  }
};

export const getUserWithMembersAction = async (): Promise<ActionResponse<unknown>> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return getActionResponse();

    const { db } = await getAuthenticatedClient();

    const userWithMembers = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        member: {
          include: {
            organization: true,
          },
        },
      },
    });

    return getActionResponse({ data: userWithMembers });
  } catch (error) {
    return getActionResponse({ error });
  }
};
```

## Role-Based Access Hooks

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserWithMembersAction } from "./access.actions";

export const useGetUserMembers = () => {
  return useQuery({
    queryKey: ["user-members"],
    queryFn: async () => {
      const { data, error } = await getUserWithMembersAction();
      if (error) throw new Error(error);
      return data;
    },
  });
};

export const useAdminAccess = () => {
  const { data: userWithMembers } = useGetUserMembers();

  const hasAdminRole = userWithMembers?.member?.some(
    (m: { role: string }) => m.role === "admin" || m.role === "owner"
  );

  const isSuperAdmin = userWithMembers?.role === "super-admin";

  return hasAdminRole || isSuperAdmin;
};
```

# Utility files:

## `prisma-rls.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

function forUser(userId: string, tenantId?: string) {
  return Prisma.defineExtension((prisma) =>
    prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            if (tenantId) {
              const [, , result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
                prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
                query(args),
              ]);
              return result;
            } else {
              const [, result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, TRUE)`,
                query(args),
              ]);
              return result;
            }
          },
        },
      },
    })
  );
}

export function createRLSClient(userId: string, tenantId?: string) {
  return prisma.$extends(forUser(userId, tenantId));
}
```

## `auth.util.ts`

```typescript
import { User } from "better-auth";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import { auth, Session } from "./auth";
import { createRLSClient } from "./prisma-rls";

export async function getAuthenticatedClient(user?: User): Promise<{
  db: ReturnType<typeof createRLSClient>;
  session: Session | null;
}> {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  const userId = user?.id || session?.user.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const db = createRLSClient(userId);

  return { db, session };
}

export function generateSupabaseJWT(userId: string, userRole: string): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("SUPABASE_JWT_SECRET is required for JWT generation");
  }

  const payload = {
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: userId,
    email: `${userId}@better-auth.local`,
    role: "authenticated",
    user_metadata: {
      better_auth_user_id: userId,
      better_auth_role: userRole,
    },
    app_metadata: {
      provider: "better-auth",
      providers: ["better-auth"],
    },
  };

  return jwt.sign(payload, jwtSecret, {
    algorithm: "HS256",
  });
}
```

## `log.util.ts`:

```typescript
export enum LOG_LABELS {
  GENERATE = "generate",
  API = "api",
  AUTH = "auth",
  DB = "db",
  FETCH = "fetch",
  RATE_LIMIT = "rate-limit",
  IMAGE = "image",
  WIDGET = "widget",
}

interface ConditionalLogOptions {
  maxStringLength?: number;
  label: LOG_LABELS | string;
}

export function conditionalLog(
  data: unknown,
  options: ConditionalLogOptions
): string | null {
  const { maxStringLength = 200, label } = options;

  const logLabels = process.env.NEXT_PUBLIC_LOG_LABELS;

  if (!logLabels || logLabels === "none") {
    return null;
  }

  if (logLabels !== "all") {
    const allowedLabels = logLabels.split(",").map((l) => l.trim());
    if (!allowedLabels.includes(label)) {
      return null;
    }
  }

  try {
    const processedData = deepStringify(data, maxStringLength, new WeakSet());
    const result = JSON.stringify(processedData);
    return result.replace(/\s+/g, "");
  } catch (error) {
    return JSON.stringify({ error: "Failed to stringify data", label });
  }
}

function deepStringify(
  value: unknown,
  maxLength: number,
  seen: WeakSet<object>
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value, maxLength);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message, maxLength),
      stack: value.stack ? truncateString(value.stack, maxLength) : undefined,
    };
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular Reference]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
      const result = value.map((item) => deepStringify(item, maxLength, seen));
      seen.delete(value);
      return result;
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepStringify(val, maxLength, seen);
    }
    seen.delete(value);
    return result;
  }

  return String(value);
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  const startLength = Math.floor((maxLength - 3) / 2);
  const endLength = maxLength - 3 - startLength;

  return str.slice(0, startLength) + "..." + str.slice(-endLength);
}
```
