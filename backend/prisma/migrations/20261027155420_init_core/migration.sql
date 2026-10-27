/*
  Warnings:

  - You are about to drop the `Contest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "allowed_emails" DROP CONSTRAINT "allowed_emails_contestId_fkey";

-- DropForeignKey
ALTER TABLE "broadcasts" DROP CONSTRAINT "broadcasts_contestId_fkey";

-- DropForeignKey
ALTER TABLE "broadcasts" DROP CONSTRAINT "broadcasts_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "contest_participants" DROP CONSTRAINT "contest_participants_contestId_fkey";

-- DropForeignKey
ALTER TABLE "contest_participants" DROP CONSTRAINT "contest_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_contestId_fkey";

-- DropForeignKey
ALTER TABLE "points" DROP CONSTRAINT "points_contestId_fkey";

-- DropForeignKey
ALTER TABLE "problems" DROP CONSTRAINT "problems_contestId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_contestId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_contestId_fkey";

-- DropTable
DROP TABLE "Contest";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platformRole" "PlatformRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "leaderboardPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contests_slug_key" ON "contests"("slug");

-- AddForeignKey
ALTER TABLE "allowed_emails" ADD CONSTRAINT "allowed_emails_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_one_actor_check"
  CHECK (num_nonnulls("participantId", "userId") = 1);