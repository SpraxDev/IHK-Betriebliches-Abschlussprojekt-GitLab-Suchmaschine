-- DropIndex
DROP INDEX "file_chunks_content_idx";

-- DropIndex
DROP INDEX "repository_files_file_name_idx";

-- DropIndex
DROP INDEX "repository_files_file_path_idx";

-- CreateIndex
CREATE INDEX "file_chunks_content_idx" ON "file_chunks" USING GIN ("content" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "file_chunks_order_idx" ON "file_chunks"("order" ASC);

-- CreateIndex
CREATE INDEX "files_created_at_idx" ON "files"("created_at" DESC);

-- CreateIndex
CREATE INDEX "repository_files_file_path_idx" ON "repository_files" USING GIN ("file_path" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "repository_files_file_name_idx" ON "repository_files" USING GIN ("file_name" gin_trgm_ops);
