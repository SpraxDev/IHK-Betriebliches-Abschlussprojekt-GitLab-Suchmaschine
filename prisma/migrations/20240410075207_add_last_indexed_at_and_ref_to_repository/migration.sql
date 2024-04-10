-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "last_indexed_at" TIMESTAMP(3),
ADD COLUMN     "last_indexed_ref" TEXT;
