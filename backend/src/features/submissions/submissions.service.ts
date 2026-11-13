
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

const submissionFields = {
    id: true,
    problemId: true,
    language: true,
    status: true,
    verdict: true,
    clickedAt: true,
    judgedAt: true,
    createdAt: true,
    problem: {
        select: { number: true, title: true, status: true }
    }
} satisfies Prisma.SubmissionSelect;

type SubmissionSummary = Prisma.SubmissionGetPayload<{ select: typeof submissionFields }>;
type AwardedPoint = { problemId: string; points: number; solveTime: Date };

const formatSubmission = (submission: SubmissionSummary, point?: AwardedPoint) => ({
    id: submission.id,
    problemId: submission.problemId,
    problemLetter: String.fromCharCode(64 + submission.problem.number),
    problemTitle: submission.problem.title,
    language: submission.language,
    status: submission.status,
    verdict: submission.verdict,
    clickedAt: submission.clickedAt,
    judgedAt: submission.judgedAt,
    createdAt: submission.createdAt,
    // The points row identifies the submission that first earned this problem's score.
    points: submission.verdict === "accepted" && submission.problem.status === "active" &&
        point?.solveTime.getTime() === submission.clickedAt.getTime() ? point.points : 0
});

const getOwnSubmissions = async (contestId: string, participantId: string) => {
    const submissions = await prisma.submission.findMany({
        where: { contestId, participantId },
        select: submissionFields,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    // Read points after submissions so a completed verdict includes its committed award.
    const points = await prisma.point.findMany({
        where: { contestId, participantId },
        select: { problemId: true, points: true, solveTime: true }
    });

    const pointsByProblem = new Map(points.map(point => [point.problemId, point]));
    return submissions.map(submission => formatSubmission(submission, pointsByProblem.get(submission.problemId)));
};

const getOwnSubmission = async (contestId: string, participantId: string, id: string) => {
    const submission = await prisma.submission.findFirst({
        where: { id, contestId, participantId },
        select: { ...submissionFields, code: true, compileOutput: true }
    });

    if (!submission) throw new ApiError(404, "Submission not found.");

    const point = await prisma.point.findUnique({
        where: {
            contestId_participantId_problemId: { contestId, participantId, problemId: submission.problemId }
        },
        select: { problemId: true, points: true, solveTime: true }
    });

    return {
        ...formatSubmission(submission, point ?? undefined),
        code: submission.code,
        compileOutput: submission.verdict === "compile_error" ? submission.compileOutput : null
    };
};

export { submitCode, getOwnSubmissions, getOwnSubmission };
