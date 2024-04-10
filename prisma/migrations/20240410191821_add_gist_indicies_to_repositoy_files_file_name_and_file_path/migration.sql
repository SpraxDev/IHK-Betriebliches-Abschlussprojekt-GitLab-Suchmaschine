/*
  Warnings:

  - Added the required column `file_name` to the `repository_files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "repository_files" ADD COLUMN     "file_name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "repository_files_file_path_idx" ON "repository_files" USING GIST ("file_path" gist_trgm_ops);

-- CreateIndex
CREATE INDEX "repository_files_file_name_idx" ON "repository_files" USING GIST ("file_name" gist_trgm_ops);
