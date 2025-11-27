-- CreateTable
CREATE TABLE "public"."History" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "History_organizationId_createdAt_idx" ON "public"."History"("organizationId", "createdAt");
