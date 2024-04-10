/*
  Warnings:

  - Added the required column `project_url` to the `repositories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "project_url" TEXT NOT NULL;
