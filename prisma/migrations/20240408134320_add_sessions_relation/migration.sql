-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires");
