/*
  Warnings:

  - The primary key for the `commits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `gitlab_project_id` on the `commits` table. All the data in the column will be lost.
  - The primary key for the `repository_files` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `filePath` on the `repository_files` table. All the data in the column will be lost.
  - You are about to drop the column `gitlab_project_id` on the `repository_files` table. All the data in the column will be lost.
  - Added the required column `project_id` to the `commits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_path` to the `repository_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `repository_files` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "commits" DROP CONSTRAINT "commits_gitlab_project_id_fkey";

-- DropForeignKey
ALTER TABLE "repository_files" DROP CONSTRAINT "repository_files_gitlab_project_id_fkey";

-- AlterTable
ALTER TABLE "commits" DROP CONSTRAINT "commits_pkey",
DROP COLUMN "gitlab_project_id",
ADD COLUMN     "project_id" INTEGER NOT NULL,
ADD CONSTRAINT "commits_pkey" PRIMARY KEY ("project_id", "git_object_id");

-- AlterTable
ALTER TABLE "repository_files" DROP CONSTRAINT "repository_files_pkey",
DROP COLUMN "filePath",
DROP COLUMN "gitlab_project_id",
ADD COLUMN     "file_path" TEXT NOT NULL,
ADD COLUMN     "project_id" INTEGER NOT NULL,
ADD CONSTRAINT "repository_files_pkey" PRIMARY KEY ("project_id", "file_path", "branch");

-- AddForeignKey
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "repositories"("gitlab_project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "repositories"("gitlab_project_id") ON DELETE RESTRICT ON UPDATE CASCADE;
