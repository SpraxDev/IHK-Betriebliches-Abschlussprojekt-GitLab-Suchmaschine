-- CreateTable
CREATE TABLE "User" (
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "_RepositoryToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RepositoryToUser_AB_unique" ON "_RepositoryToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RepositoryToUser_B_index" ON "_RepositoryToUser"("B");

-- AddForeignKey
ALTER TABLE "_RepositoryToUser" ADD CONSTRAINT "_RepositoryToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "repositories"("gitlab_project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepositoryToUser" ADD CONSTRAINT "_RepositoryToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
