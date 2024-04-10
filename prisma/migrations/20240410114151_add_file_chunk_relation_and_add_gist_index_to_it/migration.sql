/*
  Warnings:

  - You are about to drop the column `content` on the `files` table. All the data in the column will be lost.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- AlterTable
ALTER TABLE "files" DROP COLUMN "content";

-- CreateTable
CREATE TABLE "file_chunks" (
    "file_sha256" BYTEA NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "file_chunks_pkey" PRIMARY KEY ("file_sha256","order")
);

-- CreateIndex
CREATE INDEX "file_chunks_content_idx" ON "file_chunks" USING GIST ("content" gist_trgm_ops);

-- AddForeignKey
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_sha256_fkey" FOREIGN KEY ("file_sha256") REFERENCES "files"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;
