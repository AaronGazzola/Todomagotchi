import { createRLSClient } from "./prisma-rls";
import {
  ActorRole,
  EntityType,
  HistoryMetadata,
  InteractionType,
} from "@/app/(components)/History.types";

export interface ActorContext {
  actorId: string;
  actorName: string;
  actorRole: ActorRole;
}

export async function getActorContext(
  db: ReturnType<typeof createRLSClient>,
  userId: string,
  userName: string | null,
  userEmail: string,
  organizationId: string
): Promise<ActorContext> {
  const member = await db.member.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: { role: true },
  });

  return {
    actorId: userId,
    actorName: userName || userEmail,
    actorRole: (member?.role as ActorRole) || "member",
  };
}

export interface CreateHistoryParams {
  db: ReturnType<typeof createRLSClient>;
  organizationId: string;
  interactionType: InteractionType;
  entityType: EntityType;
  entityId: string | null;
  actorContext: ActorContext;
  metadata?: HistoryMetadata;
}

export async function createHistoryEntry({
  db,
  organizationId,
  interactionType,
  entityType,
  entityId,
  actorContext,
  metadata,
}: CreateHistoryParams) {
  return db.history.create({
    data: {
      organizationId,
      interactionType,
      entityType,
      entityId,
      actorId: actorContext.actorId,
      actorName: actorContext.actorName,
      actorRole: actorContext.actorRole,
      metadata: metadata as object,
    },
  });
}
