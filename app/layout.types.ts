import { user } from "@prisma/client";

export interface AppState {
  user: user | null;
  setUser: (user: user | null) => void;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
  reset: () => void;
}
