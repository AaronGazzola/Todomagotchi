/*
  Warnings:

  - A unique constraint covering the columns `[slug,createdBy]` on the table `organization` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "auth"."organization_slug_key";

-- AlterTable
ALTER TABLE "auth"."organization" ADD COLUMN     "createdBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_createdBy_key" ON "auth"."organization"("slug", "createdBy");
