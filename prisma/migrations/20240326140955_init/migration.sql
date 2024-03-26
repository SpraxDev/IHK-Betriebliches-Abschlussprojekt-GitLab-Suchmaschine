-- CreateTable
CREATE TABLE "repositories" (
    "gitlab_project_id" INTEGER NOT NULL,
    "display_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("gitlab_project_id")
);

-- CreateTable
CREATE TABLE "files" (
    "sha256" BYTEA NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("sha256")
);

-- CreateTable
CREATE TABLE "repository_files" (
    "gitlab_project_id" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "file_sha256" BYTEA NOT NULL,

    CONSTRAINT "repository_files_pkey" PRIMARY KEY ("gitlab_project_id","filePath","branch")
);

-- CreateTable
CREATE TABLE "commits" (
    "gitlab_project_id" INTEGER NOT NULL,
    "git_object_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "diff" TEXT NOT NULL,

    CONSTRAINT "commits_pkey" PRIMARY KEY ("gitlab_project_id","git_object_id")
);

-- AddForeignKey
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_gitlab_project_id_fkey" FOREIGN KEY ("gitlab_project_id") REFERENCES "repositories"("gitlab_project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_file_sha256_fkey" FOREIGN KEY ("file_sha256") REFERENCES "files"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_gitlab_project_id_fkey" FOREIGN KEY ("gitlab_project_id") REFERENCES "repositories"("gitlab_project_id") ON DELETE RESTRICT ON UPDATE CASCADE;
