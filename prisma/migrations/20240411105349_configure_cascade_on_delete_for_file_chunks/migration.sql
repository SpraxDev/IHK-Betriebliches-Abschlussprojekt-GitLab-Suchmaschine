-- DropForeignKey
ALTER TABLE "file_chunks" DROP CONSTRAINT "file_chunks_file_sha256_fkey";

-- AddForeignKey
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_sha256_fkey" FOREIGN KEY ("file_sha256") REFERENCES "files"("sha256") ON DELETE CASCADE ON UPDATE CASCADE;
