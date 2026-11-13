import { prisma } from "../../config/db.js";
import ApiError from "../../utils/ApiError.js";
import { normalizeEmail } from "../../utils/normalize.js";

export const createProblemWithTests = async (
    contestId: string,
    problemData: any,
    testCases: any[]
) => {
    const problem = await prisma.problem.create({
        data: {
            contestId,
            number: problemData.number,
            title: problemData.title,
            statement: problemData.statement,
            points: problemData.points,
            type: problemData.type,
            starterCode: problemData.starterCode ?? {},
            driverCode: problemData.driverCode ?? {},
            status: "active",
            testCases: {
                create: testCases.map((tc) => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput.trim(),
                    isSample: tc.isSample,
                    position: tc.position
                }))
            }
        },
        select: {
            id: true,
            number: true,
            title: true,
            statement: true,
            points: true,
            type: true,
            starterCode: true,
            driverCode: true,
            testCases: {
                select: {
                    id: true,
                    input: true,
                    expectedOutput: true,
                    isSample: true,
                    position: true
                }
            }
        }
    });

    return problem;
};

export const getProblemWithTests = async (contestId: string, problemId: string) => {
    const problem = await prisma.problem.findFirst({
        where: {
            contestId,
            OR: [
                { id: problemId },
                { number: isNaN(Number(problemId)) ? undefined : Number(problemId) }
            ].filter(Boolean) as any
        },
        include: {
            testCases: {
                orderBy: { position: "asc" }
            }
        }
    });

    if (!problem) {
        throw new ApiError(404, "Problem not found in this contest.");
    }

    return problem;
};

export const updateProblemWithTests = async (
    contestId: string,
    problemId: string,
    problemData: {
        number?: number;
        title?: string;
        statement?: string;
        points?: number;
        type?: string;
        starterCode?: any;
        driverCode?: any;
    },
    testCases?: {
        input: string;
        expectedOutput: string;
        isSample: boolean;
        position: number;
    }[]
) => {
    const existing = await prisma.problem.findFirst({
        where: {
            contestId,
            OR: [
                { id: problemId },
                { number: isNaN(Number(problemId)) ? undefined : Number(problemId) }
            ].filter(Boolean) as any
        }
    });

    if (!existing) {
        throw new ApiError(404, "Problem not found in this contest.");
    }

    if (problemData.number !== undefined && problemData.number !== existing.number) {
        const conflict = await prisma.problem.findUnique({
            where: {
                contestId_number: {
                    contestId,
                    number: problemData.number
                }
            }
        });
        if (conflict) {
            throw new ApiError(400, `Problem number ${problemData.number} already exists in this contest.`);
        }
    }

    return prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (problemData.number !== undefined) updateData.number = problemData.number;
        if (problemData.title !== undefined) updateData.title = problemData.title;
        if (problemData.statement !== undefined) updateData.statement = problemData.statement;
        if (problemData.points !== undefined) updateData.points = problemData.points;
        if (problemData.type !== undefined) updateData.type = problemData.type;
        if (problemData.starterCode !== undefined) updateData.starterCode = problemData.starterCode;
        if (problemData.driverCode !== undefined) updateData.driverCode = problemData.driverCode;

        if (Array.isArray(testCases) && testCases.length > 0) {
            await tx.testCase.deleteMany({
                where: { problemId: existing.id }
            });

            await tx.testCase.createMany({
                data: testCases.map((tc, idx) => ({
                    problemId: existing.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput.trim(),
                    isSample: tc.isSample,
                    position: tc.position ?? idx + 1
                }))
            });
        }

        const updated = await tx.problem.update({
            where: { id: existing.id },
            data: updateData,
            include: {
                testCases: {
                    orderBy: { position: "asc" }
                }
            }
        });

        return updated;
    });
};

export const getContestCandidates = async (contestId: string) => {
    const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: {
            id: true,
            slug: true,
            title: true,
            accessType: true,
            allowedEmails: {
                orderBy: { email: "asc" }
            },
            _count: {
                select: {
                    participants: true,
                    allowedEmails: true
                }
            }
        }
    });

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    return {
        accessType: contest.accessType,
        totalAllowed: contest._count.allowedEmails,
        totalParticipants: contest._count.participants,
        allowedEmails: contest.allowedEmails
    };
};

export const addContestCandidates = async (
    moderatorUserId: string,
    contestId: string,
    emailList: string[]
) => {
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const normalized = Array.from(
        new Set(
            emailList
                .map((e) => normalizeEmail(e))
                .filter((e) => e.length > 0 && e.includes("@"))
        )
    );

    if (normalized.length === 0) {
        throw new ApiError(400, "No valid email addresses provided.");
    }

    const records = normalized.map((email) => ({
        contestId,
        email
    }));

    const result = await prisma.allowedEmail.createMany({
        data: records,
        skipDuplicates: true
    });

    await prisma.event.create({
        data: {
            contestId,
            userId: moderatorUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "moderator_add_candidates",
                moderatorUserId,
                addedCount: result.count
            }
        }
    });

    return { added: result.count, totalProcessed: normalized.length };
};

export const removeContestCandidate = async (
    moderatorUserId: string,
    contestId: string,
    email: string
) => {
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const targetEmail = normalizeEmail(email);

    await prisma.allowedEmail.deleteMany({
        where: { contestId, email: targetEmail }
    });

    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (targetUser) {
        await prisma.contestParticipant.updateMany({
            where: { contestId, userId: targetUser.id },
            data: { disqualifiedAt: new Date(), activeSessionId: null }
        });

        await prisma.session.deleteMany({
            where: { contestId, userId: targetUser.id }
        });
    }

    await prisma.event.create({
        data: {
            contestId,
            userId: moderatorUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "moderator_remove_candidate",
                moderatorUserId,
                revokedEmail: targetEmail,
                disqualified: Boolean(targetUser)
            }
        }
    });

    return { success: true, email: targetEmail };
};
