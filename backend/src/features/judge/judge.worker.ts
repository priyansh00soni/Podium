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

        // 1. Get the single job from the array
        const job = jobs[0];
        if (!job) return

        const data = job.data as any;
        const submissionId = String(data.submissionId);

        // 2. Load the submission and problem from the database
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: { problem: true }
        });

        if (!submission) {
            return;
        }

        let timerId: NodeJS.Timeout | undefined;

        try {
            // 3. Mark as judging so the user sees the loading spinner
            await prisma.submission.update({
                where: { id: submissionId },
                data: { status: "judging" }
            });

            // 4. Load the test cases from the disk
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

            // 5. Get the time and memory limits for this specific language
            const limits = getLanguageLimits(submission.language);
            
            // 6. Setup the 120-second hard timeout timer
            const timeoutPromise = new Promise((resolve, reject) => {
                timerId = setTimeout(() => {
                    const timeoutError = new Error("Judge hard timeout reached (120s)");
                    reject(timeoutError);
                }, HARD_TIMEOUT_MS);
            });

            // 7. Run the tests, but abort if the 120-second timer finishes first
            const verdict = await Promise.race([
                runTests(submission.code, submission.language, tests, limits),
                timeoutPromise
            ]);

            // 8. Save the final results to the database atomically
            await prisma.$transaction(async (tx) => {
                
                // Update the submission status
                await tx.submission.update({
                    where: { id: submissionId },
                    data: {
                        status: "done",
                        verdict: verdict as any, // Cast prevents strict enum mismatches
                        judgedAt: new Date()
                    }
                });

                // Award points if they got it right
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

                // Create the audit event (safely formatting the metadata for Prisma JSON)
                const successMetadata = { finalVerdict: String(verdict) };
                
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
            // 9. If ANYTHING fails (network, missing files, timeouts), handle it safely
            const errorName = error instanceof Error ? error.name : "unknown";
            judgeLogger.error(`Judge execution error: ${errorName}`);
            
            try {
                // Safely mark the submission as a judge_error so the student isn't stuck
                await prisma.$transaction(async (tx) => {
                    
                    await tx.submission.update({
                        where: { id: submissionId },
                        data: {
                            status: "done",
                            verdict: "judge_error",
                            judgedAt: new Date()
                        }
                    });

                    // Format error metadata safely for Prisma JSON
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
            // 10. Always clear the timeout timer so it doesn't leak memory
            if (timerId) {
                clearTimeout(timerId);
            }
        }
    });
}