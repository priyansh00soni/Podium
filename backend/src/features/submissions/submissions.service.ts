
import { fromPrisma } from "pg-boss";
import {prisma} from "../../config/db.js";
import { getContestState } from "../contest/contest.state.js";
import { submissionHash } from "../../utils/normalize.js";
import ApiError from "../../utils/ApiError.js";
import { boss } from "../../config/queue.js"; 
import { Prisma, Language } from "../../generated/prisma/client.js";

const submitCode = async (
    membership: any, 
    problemId: string,
    language: Language,
    code: string,
    clickedAt: Date,
    startsAt: Date,
    endsAt: Date
) => {
    // 1. Contest state is running
    if (getContestState(startsAt, endsAt) !== "running") {
        throw new ApiError(403, "Contest is not currently active.");
    }

    // 2. The problem exists in this contest and is active
    const problem = await prisma.problem.findFirst({
        where: { id: problemId, contestId: membership.contestId, status: "active" }
    });
    
    if (!problem) {
        throw new ApiError(404, "Problem not found or inactive.");
    }

    // 3. Compute the fingerprint and check for exact duplicates immediately
    const fingerprint = submissionHash(membership.id, problem.id, language, code);

    const existingSubmission = await prisma.submission.findUnique({
        where: {
            contestId_submissionHash: {
                contestId: membership.contestId,
                submissionHash: fingerprint
            }
        }
    });

    if (existingSubmission) {
        return existingSubmission; 
    }

    // 4. Transaction with Row Lock to prevent rate-limit/pending race conditions
    try {
        const submission = await prisma.$transaction(async (tx) => {
            // Lock this participant's row so concurrent submits queue up behind each other
            await tx.$queryRaw`SELECT id FROM contest_participants WHERE id = ${membership.id} FOR UPDATE`;

            // Rate limit check running under the lock
            const tenSecondsAgo = new Date(Date.now() - 10000);
            const recentSubmission = await tx.submission.findFirst({
                where: {
                    contestId: membership.contestId,
                    participantId: membership.id,
                    problemId: problem.id,
                    createdAt: { gt: tenSecondsAgo }
                },
                orderBy: { createdAt: "desc" }
            });

            if (recentSubmission) {
                const secondsLeft = Math.ceil((recentSubmission.createdAt.getTime() + 10000 - Date.now()) / 1000);
                throw new ApiError(429, `Please wait ${secondsLeft} seconds before submitting again.`);
            }

            // Pending submission check running under the lock
            const pendingSubmission = await tx.submission.findFirst({
                where: {
                    contestId: membership.contestId,
                    participantId: membership.id,
                    status: { in: ["queued", "judging"] }
                }
            });

            if (pendingSubmission) {
                throw new ApiError(429, "You already have a submission in progress. Please wait for it to finish.");
            }

            // Insert submission and enqueue job
            const newSubmission = await tx.submission.create({
                data: {
                    contestId: membership.contestId,
                    participantId: membership.id,
                    problemId: problem.id,
                    language,
                    code,
                    submissionHash: fingerprint,
                    clickedAt,
                    status: "queued"
                }
            });

            await boss.send(
                "judge-submission", 
                { submissionId: newSubmission.id }, 
                { 
                    db: fromPrisma(tx),
                    retryLimit: 0,
                    expireInSeconds: 180 
                }
            );
            return newSubmission;
        });

        return submission;

    } catch (error: any) {
        // Fallback for extreme edge cases where exact same code slips through to the unique constraint
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const doubleCheckExisting = await prisma.submission.findUnique({
                where: {
                    contestId_submissionHash: {
                        contestId: membership.contestId,
                        submissionHash: fingerprint
                    }
                }
            });
            if (doubleCheckExisting) return doubleCheckExisting;
        }
        throw error;
    }
};

export { submitCode };