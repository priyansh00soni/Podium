import { fromPrisma } from "pg-boss"; // pg-boss Prisma adapter for transactional enqueue
import {prisma} from "../../config/db.js";
import { getContestState } from "../contest/contest.state.js";
import { submissionHash } from "../../utils/normalize.js";
import ApiError from "../../utils/ApiError.js";
import { boss } from '../../config/queue.js'; 
import { Prisma } from "../../generated/prisma/client.js";

const submitCode = async (
    membership: any, // Populated from auth middleware
    problemId: string,
    language: "c" | "cpp" | "java" | "javascript" | "python",
    code: string,
    clickedAt: Date
) => {
    // We need the contest details for state checking
    const contest = await prisma.contest.findUnique({
        where: { id: membership.contestId }
    });
    
    if (!contest) throw new ApiError(404, "Contest not found.");

    // 1. Contest state is running
    if (getContestState(contest.startsAt, contest.endsAt) !== "running") {
        throw new ApiError(403, "Contest is not currently active.");
    }

    // 2. The problem exists in this contest and is active
    const problem = await prisma.problem.findFirst({
        where: { id: problemId, contestId: contest.id, status: "active" }
    });
    
    if (!problem) {
        throw new ApiError(404, "Problem not found or inactive.");
    }

    // 3. Rate limit: query submissions for this participant and problem in the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const recentSubmission = await prisma.submission.findFirst({
        where: {
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

    // 4. One pending action: reject if there is any submission queued or judging
    const pendingSubmission = await prisma.submission.findFirst({
        where: {
            participantId: membership.id,
            status: { in: ["queued", "judging"] }
        }
    });

    if (pendingSubmission) {
        throw new ApiError(429, "You already have a submission in progress. Please wait for it to finish.");
    }

    // 5. Compute the fingerprint
    const fingerprint = submissionHash(membership.id, problem.id, language, code);

    try {
        // 6. In one transaction: insert the submission row and send the job
        const submission = await prisma.$transaction(async (tx) => {
            const newSubmission = await tx.submission.create({
                data: {
                    contestId: contest.id,
                    participantId: membership.id,
                    problemId: problem.id,
                    language,
                    code,
                    submissionHash: fingerprint,
                    clickedAt,
                    status: "queued"
                }
            });

            // Pass the Prisma transaction client to pg-boss using fromPrisma
            await boss.send(
                "judge-submission", 
                { submissionId: newSubmission.id }, 
                { db: fromPrisma(tx) }
            );

            return newSubmission;
        });

        return submission;

    } catch (error: any) {
        // 7. If insert fails with Prisma error P2002, exact same code was already submitted
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const existingSubmission = await prisma.submission.findUnique({
                where: {
                    contestId_submissionHash: {
                        contestId: contest.id,
                        submissionHash: fingerprint
                    }
                }
            });
            
            if (existingSubmission) {
                return existingSubmission; // Return the existing row as requested
            }
        }
        
        throw error;
    }
};

export { submitCode };