import { boss } from "../../config/queue.js";
import { prisma } from "../../config/db.js";
import { getLanguageLimits } from "./judge.limits.js";
import { runTests } from "./judge.js";
import { sanitizeCompileOutput } from "./judge.sanitize.js";
import { createComponentLogger } from "../../utils/logger.js";

const judgeLogger = createComponentLogger("judge");
const HARD_TIMEOUT_MS = 120 * 1000;

export async function startJudgeWorker() {
    // FIX: Changed localConcurrency to 2
    await boss.work<{ submissionId: string }>("judge-submission", { localConcurrency: 2, batchSize: 1 }, async (jobs) => {

        const job = jobs[0];
        if (!job) return

        const submissionId = job.data.submissionId;
        if (typeof submissionId !== "string") return;

        // ADDED LOG: Required by migration plan
        judgeLogger.info(`Processing job ${job.id} for submission ${submissionId}. Active jobs running: limit is strictly 2.`);

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                problem: {
                    include: {
                        testCases: {
                            orderBy: { position: 'asc' }
                        }
                    }
                }
            }
        });

        if (!submission || submission.status === "done") {
            return;
        }

        let timerId: NodeJS.Timeout | undefined;

        try {
            const claimed = await prisma.submission.updateMany({
                where: { id: submissionId, contestId: submission.contestId, status: "queued" },
                data: { status: "judging" }
            });
            if (claimed.count === 0) return;

            const tests = submission.problem.testCases;

            if (!tests || tests.length === 0) {
                throw new Error("No tests available for this problem.");
            }

            const limits = getLanguageLimits(submission.language);
            
            const timeoutPromise = new Promise<never>((resolve, reject) => {
                timerId = setTimeout(() => {
                    const timeoutError = new Error("Judge hard timeout reached (120s)");
                    reject(timeoutError);
                }, HARD_TIMEOUT_MS);
            });

            const driverCodeMap = (submission.problem.driverCode as Record<string, string>) || {};
            const driver = driverCodeMap[submission.language];
            const codeToExecute = driver && typeof driver === "string" && driver.trim().length > 0
                ? `${submission.code}\n\n// --- HIDDEN DRIVER HARNESS ---\n${driver}`
                : submission.code;

            const result = await Promise.race([
                runTests(codeToExecute, submission.language, tests, limits),
                timeoutPromise
            ]);

            const sanitizedCompileOutput = sanitizeCompileOutput(
                result.compileOutput,
                submission.code
            );

            await prisma.$transaction(async (tx) => {
                await tx.submission.update({
                    where: { contestId_id: { contestId: submission.contestId, id: submissionId } },
                    data: {
                        status: "done",
                        verdict: result.verdict,
                        compileOutput: sanitizedCompileOutput,
                        judgedAt: new Date()
                    }
                });

                if (result.verdict === "accepted") {
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

                const successMetadata = { finalVerdict: result.verdict };
                
                await tx.event.create({
                    data: {
                        contestId: submission.contestId,
                        participantId: submission.participantId,
                        eventType: "verdict",
                        submissionId: submission.id,
                        metadata: successMetadata 
                    }
                });
            });

        } catch (error: any) {
            const errorName = error instanceof Error ? error.name : "unknown";
            judgeLogger.error(`Judge execution error: ${errorName}`);
            
            try {
                // FIXED: Wrapped the fallback operations in a proper $transaction block with 'tx' defined
                await prisma.$transaction(async (tx) => {
                    await tx.submission.update({
                        where: { contestId_id: { contestId: submission.contestId, id: submissionId } },
                        data: {
                            status: "done",
                            verdict: "judge_error",
                            compileOutput: null,
                            judgedAt: new Date()
                        }
                    });

                    const errorMetadata = { errorMessage: errorName };

                    await tx.event.create({
                        data: {
                            contestId: submission.contestId,
                            participantId: submission.participantId,
                            eventType: "judge_error",
                            submissionId: submission.id,
                            metadata: errorMetadata
                        }
                    });
                });
            } catch (fallbackError: any) {
                const fallbackName = fallbackError instanceof Error ? fallbackError.name : "unknown";
                judgeLogger.error(`Judge worker fallback failed: ${fallbackName}`);
            }
            
        } finally {
            if (timerId) {
                clearTimeout(timerId);
            }
        }
    });
}