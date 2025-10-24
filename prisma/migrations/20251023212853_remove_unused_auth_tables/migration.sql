/*
  Warnings:

  - You are about to drop the column `activeOrganizationId` on the `session` table. All the data in the column will be lost.
  - You are about to drop the `MagicLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `member` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auth"."MagicLink" DROP CONSTRAINT "MagicLink_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth"."invitation" DROP CONSTRAINT "invitation_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "auth"."invitation" DROP CONSTRAINT "invitation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "auth"."member" DROP CONSTRAINT "member_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "auth"."member" DROP CONSTRAINT "member_userId_fkey";

-- AlterTable
ALTER TABLE "auth"."session" DROP COLUMN "activeOrganizationId";

-- DropTable
DROP TABLE "auth"."MagicLink";

-- DropTable
DROP TABLE "auth"."invitation";

-- DropTable
DROP TABLE "auth"."member";

-- DropTable
DROP TABLE "auth"."organization";
