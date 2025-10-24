-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateTable
CREATE TABLE "auth"."user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "emailVerified" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "inviterId" TEXT NOT NULL,
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Todo" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tamagotchi" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hunger" INTEGER NOT NULL DEFAULT 7,
    "happiness" INTEGER NOT NULL DEFAULT 100,
    "wasteCount" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#1f2937',
    "species" TEXT NOT NULL DEFAULT 'species0',
    "age" INTEGER NOT NULL DEFAULT 0,
    "feedCount" INTEGER NOT NULL DEFAULT 0,
    "lastFedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCleanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tamagotchi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "auth"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "auth"."session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "auth"."account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "auth"."verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "auth"."organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "member_userId_organizationId_key" ON "auth"."member"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_token_key" ON "auth"."invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_email_organizationId_key" ON "auth"."invitation"("email", "organizationId");

-- CreateIndex
CREATE INDEX "Todo_organizationId_idx" ON "public"."Todo"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tamagotchi_organizationId_key" ON "public"."Tamagotchi"("organizationId");

-- AddForeignKey
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "public"."Todo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Tamagotchi" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Todo
CREATE POLICY "Users can view organization todos"
  ON "public"."Todo"
  FOR SELECT
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can insert organization todos"
  ON "public"."Todo"
  FOR INSERT
  WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can update organization todos"
  ON "public"."Todo"
  FOR UPDATE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can delete organization todos"
  ON "public"."Todo"
  FOR DELETE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

-- Create RLS policies for Tamagotchi
CREATE POLICY "Users can view organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR SELECT
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can insert organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR INSERT
  WITH CHECK ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can update organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR UPDATE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY "Users can delete organization tamagotchi"
  ON "public"."Tamagotchi"
  FOR DELETE
  USING ("organizationId" = current_setting('app.current_tenant_id', TRUE));

-- Create trigger to auto-create tamagotchi for new organizations
CREATE OR REPLACE FUNCTION create_organization_tamagotchi()
RETURNS TRIGGER AS $$
DECLARE
  random_species TEXT;
  species_options TEXT[] := ARRAY['species0', 'species1', 'species2', 'species3', 'species4', 'species5', 'species6', 'species7', 'species8', 'species9'];
BEGIN
  random_species := species_options[1 + FLOOR(RANDOM() * 10)::INT];

  INSERT INTO "public"."Tamagotchi" ("id", "organizationId", "color", "species", "age", "feedCount", "hunger", "lastFedAt", "lastCleanedAt", "lastCheckedAt", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    '#' || LPAD(TO_HEX((RANDOM() * 16777215)::INT), 6, '0'),
    random_species,
    0,
    0,
    7,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON "auth"."organization"
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_tamagotchi();
