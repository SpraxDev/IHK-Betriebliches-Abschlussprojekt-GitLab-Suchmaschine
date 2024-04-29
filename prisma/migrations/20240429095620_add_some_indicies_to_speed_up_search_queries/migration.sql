-- CreateIndex
CREATE INDEX "files_sha256_idx" ON "files"("sha256");

-- CreateIndex
CREATE INDEX "repository_files_file_sha256_idx" ON "repository_files"("file_sha256");
