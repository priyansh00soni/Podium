import { prisma } from "../../config/db.js";
import ApiError from "../../utils/ApiError.js";
import { normalizeEmail } from "../../utils/normalize.js";

export const listAllContests = async () => {
    return prisma.contest.findMany({
        orderBy: { startsAt: "desc" },
        select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            leaderboardPublished: true,
            accessType: true,
            createdAt: true,
            _count: {
                select: {
                    participants: true,
                    problems: true,
                    submissions: true,
                    allowedEmails: true,
                }
            }
        }
    });
};

export const getAdminContestDetail = async (contestId: string) => {
    const contest = await prisma.contest.findFirst({
        where: {
            OR: [
                { id: contestId },
                { slug: contestId.toLowerCase() }
            ]
        },
        include: {
            allowedEmails: {
                orderBy: { email: "asc" }
            },
            participants: {
                where: { role: "moderator", deletedAt: null },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            },
            problems: {
                orderBy: { number: "asc" },
                select: {
                    id: true,
                    number: true,
                    title: true,
                    points: true,
                    type: true,
                    status: true,
                }
            },
            _count: {
                select: {
                    participants: true,
                    problems: true,
                    submissions: true,
                    allowedEmails: true,
                }
            }
        }
    });

    if (!contest) throw new ApiError(404, "Contest not found.");
    return contest;
};

export const createContest = async (
    adminUserId: string,
    data: {
        slug: string;
        title: string;
        description?: string;
        startsAt: string | Date;
        endsAt: string | Date;
        leaderboardPublished?: boolean;
        accessType?: "invite_only" | "open";
    }
) => {
    const slug = data.slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new ApiError(400, "Slug must contain only lowercase letters, numbers, and hyphens.");
    }

    const existing = await prisma.contest.findUnique({ where: { slug } });
    if (existing) {
        throw new ApiError(400, `Contest with slug '${slug}' already exists.`);
    }

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
        throw new ApiError(400, "Invalid start or end date format.");
    }

    if (endsAt <= startsAt) {
        throw new ApiError(400, "Contest end time must be after start time.");
    }

    const accessType = data.accessType === "open" ? "open" : "invite_only";

    const contest = await prisma.contest.create({
        data: {
            slug,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            startsAt,
            endsAt,
            leaderboardPublished: Boolean(data.leaderboardPublished),
            accessType,
        }
    });

    // Write audit event
    await prisma.event.create({
        data: {
            contestId: contest.id,
            userId: adminUserId,
            eventType: "contest_started",
            metadata: {
                action: "create_contest",
                adminUserId,
                slug: contest.slug,
                title: contest.title,
                startsAt: contest.startsAt.toISOString(),
                endsAt: contest.endsAt.toISOString(),
            }
        }
    });

    return contest;
};

export const updateContest = async (
    adminUserId: string,
    contestId: string,
    data: {
        title?: string;
        description?: string;
        startsAt?: string | Date;
        endsAt?: string | Date;
        leaderboardPublished?: boolean;
        accessType?: "invite_only" | "open";
    }
) => {
    const contest = await prisma.contest.findFirst({
        where: { OR: [{ id: contestId }, { slug: contestId.toLowerCase() }] }
    });

    if (!contest) throw new ApiError(404, "Contest not found.");

    const now = new Date();
    const updatePayload: Record<string, any> = {};

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
    if (data.leaderboardPublished !== undefined) updatePayload.leaderboardPublished = Boolean(data.leaderboardPublished);
    if (data.accessType !== undefined) updatePayload.accessType = data.accessType === "open" ? "open" : "invite_only";

    // Schedule guardrails:
    if (data.startsAt !== undefined) {
        const newStartsAt = new Date(data.startsAt);
        if (isNaN(newStartsAt.getTime())) throw new ApiError(400, "Invalid start date format.");

        if (contest.startsAt <= now && newStartsAt.getTime() !== contest.startsAt.getTime()) {
            throw new ApiError(400, "Cannot alter start time after the contest has commenced.");
        }
        updatePayload.startsAt = newStartsAt;
    }

    if (data.endsAt !== undefined) {
        const newEndsAt = new Date(data.endsAt);
        if (isNaN(newEndsAt.getTime())) throw new ApiError(400, "Invalid end date format.");

        if (contest.startsAt <= now && newEndsAt.getTime() < contest.endsAt.getTime()) {
            throw new ApiError(400, "Contest duration can only be extended, not shortened while running.");
        }
        updatePayload.endsAt = newEndsAt;
    }

    const updated = await prisma.contest.update({
        where: { id: contest.id },
        data: updatePayload
    });

    // Write audit event
    await prisma.event.create({
        data: {
            contestId: contest.id,
            userId: adminUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "update_contest",
                adminUserId,
                changes: data,
            }
        }
    });

    return updated;
};

export const addAllowedEmails = async (
    adminUserId: string,
    contestId: string,
    emailList: string[]
) => {
    const contest = await prisma.contest.findFirst({
        where: { OR: [{ id: contestId }, { slug: contestId.toLowerCase() }] }
    });
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
        contestId: contest.id,
        email,
    }));

    const result = await prisma.allowedEmail.createMany({
        data: records,
        skipDuplicates: true,
    });

    // Write audit event
    await prisma.event.create({
        data: {
            contestId: contest.id,
            userId: adminUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "add_allowed_emails",
                adminUserId,
                addedCount: result.count,
            }
        }
    });

    return { added: result.count, totalProcessed: normalized.length };
};

export const removeAllowedEmail = async (
    adminUserId: string,
    contestId: string,
    email: string
) => {
    const contest = await prisma.contest.findFirst({
        where: { OR: [{ id: contestId }, { slug: contestId.toLowerCase() }] }
    });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const targetEmail = normalizeEmail(email);

    // Delete allowlist entry
    await prisma.allowedEmail.deleteMany({
        where: { contestId: contest.id, email: targetEmail }
    });

    // Revocation semantics: Disqualify participant & terminate active sessions
    const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (targetUser) {
        await prisma.contestParticipant.updateMany({
            where: { contestId: contest.id, userId: targetUser.id },
            data: { disqualifiedAt: new Date(), activeSessionId: null }
        });

        await prisma.session.deleteMany({
            where: { contestId: contest.id, userId: targetUser.id }
        });
    }

    // Write audit event
    await prisma.event.create({
        data: {
            contestId: contest.id,
            userId: adminUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "remove_allowed_email",
                adminUserId,
                revokedEmail: targetEmail,
                disqualified: Boolean(targetUser),
            }
        }
    });

    return { success: true, email: targetEmail };
};

export const assignModerator = async (
    adminUserId: string,
    contestId: string,
    email: string
) => {
    const contest = await prisma.contest.findFirst({
        where: { OR: [{ id: contestId }, { slug: contestId.toLowerCase() }] }
    });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const targetEmail = normalizeEmail(email);
    if (!targetEmail || !targetEmail.includes("@")) {
        throw new ApiError(400, "Valid email address is required.");
    }

    const user = await prisma.user.upsert({
        where: { email: targetEmail },
        update: {},
        create: { email: targetEmail, name: targetEmail.split("@")[0] }
    });

    const participant = await prisma.contestParticipant.upsert({
        where: { contestId_userId: { contestId: contest.id, userId: user.id } },
        update: { role: "moderator", deletedAt: null, disqualifiedAt: null },
        create: { contestId: contest.id, userId: user.id, role: "moderator" }
    });

    // Write audit event
    await prisma.event.create({
        data: {
            contestId: contest.id,
            userId: adminUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "assign_moderator",
                adminUserId,
                targetUserId: user.id,
                targetEmail,
            }
        }
    });

    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
};

export const removeModerator = async (
    adminUserId: string,
    contestId: string,
    userId: string
) => {
    const contest = await prisma.contest.findFirst({
        where: { OR: [{ id: contestId }, { slug: contestId.toLowerCase() }] }
    });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "User not found.");

    // Check if user is on the allowlist
    const isAllowed = await prisma.allowedEmail.findFirst({
        where: { contestId: contest.id, email: user.email }
    });

    if (isAllowed) {
        // Demote back to participant
        await prisma.contestParticipant.updateMany({
            where: { contestId: contest.id, userId },
            data: { role: "participant" }
        });
    } else {
        // Not on allowlist: Evict membership completely
        await prisma.contestParticipant.updateMany({
            where: { contestId: contest.id, userId },
            data: { deletedAt: new Date(), activeSessionId: null }
        });
        await prisma.session.deleteMany({
            where: { contestId: contest.id, userId }
        });
    }

    // Write audit event
    await prisma.event.create({
        data: {
            contestId: contest.id,
            userId: adminUserId,
            eventType: "broadcast_sent",
            metadata: {
                action: "remove_moderator",
                adminUserId,
                targetUserId: userId,
                demotedToParticipant: Boolean(isAllowed),
            }
        }
    });

    return { success: true, demotedToParticipant: Boolean(isAllowed) };
};

export const getPlatformStats = async () => {
    const [totalContests, totalUsers, totalSubmissions, pendingQueue] = await Promise.all([
        prisma.contest.count(),
        prisma.user.count(),
        prisma.submission.count(),
        prisma.submission.count({ where: { status: { in: ["queued", "judging"] } } }),
    ]);

    return {
        totalContests,
        totalUsers,
        totalSubmissions,
        pendingQueue,
    };
};
