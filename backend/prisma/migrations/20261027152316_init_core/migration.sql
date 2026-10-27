-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('admin');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('participant', 'moderator');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('active', 'voided');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('c', 'cpp', 'java', 'javascript', 'python');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('queued', 'judging', 'done');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('accepted', 'wrong_answer', 'tle', 'runtime_error', 'compile_error', 'judge_error');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('visibility_hidden', 'fullscreen_exit', 'paste_blocked', 'permission_denied', 'camera_stopped', 'screenshare_stopped', 'login', 'session_replaced', 'submit', 'verdict', 'judge_error', 'problem_voided', 'broadcast_sent', 'contest_started', 'contest_ended', 'submission_rejudged');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platformRole" "PlatformRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "leaderboardPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowed_emails" (
    "contestId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "rollNumber" TEXT,

    CONSTRAINT "allowed_emails_pkey" PRIMARY KEY ("contestId","email")
);

-- CreateTable
CREATE TABLE "contest_participants" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "activeSessionId" TEXT,
    "disqualifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'coding',
    "status" "ProblemStatus" NOT NULL DEFAULT 'active',
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "code" TEXT NOT NULL,
    "submissionHash" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'queued',
    "verdict" "Verdict",
    "clickedAt" TIMESTAMP(3) NOT NULL,
    "judgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "solveTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" BIGSERIAL NOT NULL,
    "contestId" TEXT NOT NULL,
    "participantId" TEXT,
    "userId" TEXT,
    "eventType" "EventType" NOT NULL,
    "submissionId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "contest_participants_contestId_userId_key" ON "contest_participants"("contestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "contest_participants_contestId_id_key" ON "contest_participants"("contestId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "problems_contestId_id_key" ON "problems"("contestId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "problems_contestId_number_key" ON "problems"("contestId", "number");

-- CreateIndex
CREATE INDEX "submissions_contestId_participantId_problemId_createdAt_idx" ON "submissions"("contestId", "participantId", "problemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_contestId_submissionHash_key" ON "submissions"("contestId", "submissionHash");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_contestId_id_key" ON "submissions"("contestId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "points_contestId_participantId_problemId_key" ON "points"("contestId", "participantId", "problemId");

-- CreateIndex
CREATE INDEX "events_contestId_participantId_createdAt_idx" ON "events"("contestId", "participantId", "createdAt");

-- CreateIndex
CREATE INDEX "events_contestId_eventType_createdAt_idx" ON "events"("contestId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "broadcasts_contestId_createdAt_idx" ON "broadcasts"("contestId", "createdAt");

-- AddForeignKey
ALTER TABLE "allowed_emails" ADD CONSTRAINT "allowed_emails_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_activeSessionId_fkey" FOREIGN KEY ("activeSessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestId_participantId_fkey" FOREIGN KEY ("contestId", "participantId") REFERENCES "contest_participants"("contestId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contestId_problemId_fkey" FOREIGN KEY ("contestId", "problemId") REFERENCES "problems"("contestId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_contestId_participantId_fkey" FOREIGN KEY ("contestId", "participantId") REFERENCES "contest_participants"("contestId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_contestId_problemId_fkey" FOREIGN KEY ("contestId", "problemId") REFERENCES "problems"("contestId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "contest_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_one_actor_check"
  CHECK (num_nonnulls("participantId", "userId") = 1);