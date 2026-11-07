import fs from "fs/promises";
import path from "path";
import { boss } from "../../config/queue.js";
import { prisma } from "../../config/db.js";
import { getLanguageLimits } from "./judge.limits.js";
import { runTests } from "./judge.js";
import { createComponentLogger } from "../../utils/logger.js";

const judgeLogger = createComponentLogger("judge");
const HARD_TIMEOUT_MS = 120 * 1000;

export async function startJudgeWorker() {
    await boss.work("judge-submission", { teamConcurrency: 4, batchSize: 1 }, async (jobs) => {
        const job = jobs[0];
        if (!job) return;

        const { submissionId } = job.data as { submissionId: string };

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { problem: true }
        });

        if (!submission) return;

        let timerId: NodeJS.Timeout | undefined;

        try {
            await prisma.submission.update({
                where: { id: submissionId },
                data: { status: "judging" }
            });

            const testsPath = path.join(process.cwd(), "data", "tests", `${submission.problemId}.json`);
            let tests: any[] = [];
            
            try {
                const testsFile = await fs.readFile(testsPath, "utf8");
                tests = JSON.parse(testsFile);
            } catch (err) {
                throw new Error("Tests file not found or invalid.");
            }

            if (!tests || tests.length === 0) {
                throw new Error("No tests available for this problem.");
            }

            // Using string literal to match the Prisma enum type internally if needed
            const limits = getLanguageLimits(submission.language);
            
            const timeoutPromise = new Promise<never>((_, reject) => {
                timerId = setTimeout(() => reject(new Error("Judge hard timeout reached (120s)")), HARD_TIMEOUT_MS);
            });

            const verdict = await Promise.race([
                runTests(submission.code, submission.language, tests, limits),
                timeoutPromise
            ]);

            await prisma.$transaction(async (tx) => {
                await tx.submission.update({
                    where: { id: submissionId },
                    data: {
                        status: "done",
                        verdict,
                        judgedAt: new Date()
                    }
                });

                if (verdict === "accepted") {
                    const existingPoint = await tx.point.findUnique({
                        where: {
                            contestId_participantId_problemId: {
                                contestId: submission.contestId,
                                participantId: submission.participantId,
                                problemId: submission.problemId
                            }
                        }
                    });

                    if (!existingPoint) {
                        await tx.point.create({
                            data: {
                                contestId: submission.contestId,
                                participantId: submission.participantId,
                                problemId: submission.problemId,
                                points: submission.problem.points,
                                solveTime: submission.clickedAt 
                            }
                        });
                    }
                }

                await tx.event.create({
                    data: {
                        contestId: submission.contestId,
                        participantId: submission.participantId,
                        eventType: "verdict",
                        submissionId: submission.id,
                        metadata: { verdict } 
                    }
                });
            });

        } catch (error: any) {
            judgeLogger.error(`Judge execution error: ${error instanceof Error ? error.name : "unknown"}`);
            
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.submission.update({
                        where: { id: submissionId },
                        data: {
                            status: "done",
                            verdict: "judge_error",
                            judgedAt: new Date()
                        }
                    });

                    await tx.event.create({
                        data: {
                            contestId: submission.contestId,
                            participantId: submission.participantId,
                            eventType: "judge_error",
                            submissionId: submission.id,
                            metadata: { error: error instanceof Error ? error.name : "Unknown error" }
                        }
                    });
                });
            } catch (fallbackError: any) {
                judgeLogger.error(`Judge worker fallback failed: ${fallbackError instanceof Error ? fallbackError.name : "unknown"}`);
            }
        } finally {
            if (timerId) clearTimeout(timerId);
        }
    });
}