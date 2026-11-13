-- CreateEnum
CREATE TYPE "ContestAccessType" AS ENUM ('invite_only', 'open');

-- AlterTable
ALTER TABLE "contests" ADD COLUMN "accessType" "ContestAccessType" NOT NULL DEFAULT 'invite_only';

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "contestId" DROP NOT NULL;

