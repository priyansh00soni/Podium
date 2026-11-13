import { CALLBACK_URL, googleClient } from "../../config/google.js";
import { normalizeEmail } from "../../utils/normalize.js";
import ApiError from "../../utils/ApiError.js";
import { prisma } from "../../config/db.js";

type SessionContext = {
    ip: string;
    userAgent: string;
};

const handleLogin = async (code: string, slug: string, sessionContext: SessionContext) => {
    const { tokens } = await googleClient.getToken({ code, redirect_uri: CALLBACK_URL });
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token! });
    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified || !payload.email) {
        throw new ApiError(400, "Google account email is not verified.");
    }

    const email = normalizeEmail(payload.email);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const isPlatformAdmin = existingUser?.platformRole === "admin";

    // Platform Super Admin Login path
    if (slug === "admin") {
        if (!existingUser || !isPlatformAdmin) {
            throw new ApiError(403, "You do not have platform administrator privileges.");
        }

        // Anchor session to an existing contest to satisfy DB relation
        const anchorContest = await prisma.contest.findFirst({ orderBy: { createdAt: "desc" } });
        if (!anchorContest) {
            throw new ApiError(500, "Cannot initialize admin session: No contest found to anchor session.");
        }

        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
        const session = await prisma.session.create({
            data: {
                contestId: anchorContest.id,
                userId: existingUser.id,
                ip: sessionContext.ip,
                userAgent: sessionContext.userAgent,
                expiresAt,
            }
        });

        return {
            sessionId: session.id,
            slug: "admin",
            isPlatformAdmin: true,
        };
    }

    // Contest Login path
    const contest = await prisma.contest.findUnique({
        where: { slug }
    });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const allowed = await prisma.allowedEmail.findFirst({
        where: { contestId: contest.id, email }
    });
    
    // Platform admin bypasses contest allowlist
    if (!allowed && !isPlatformAdmin) {
        throw new ApiError(403, "You are not on the registration list for this contest.");
    }

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: allowed?.name ?? payload.name ?? email }
    });

    const membership = await prisma.contestParticipant.upsert({
        where: { contestId_userId: { contestId: contest.id, userId: user.id } },
        update: {},
        create: {
            contestId: contest.id,
            userId: user.id,
            role: isPlatformAdmin ? "moderator" : "participant"
        }
    });

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const session = await prisma.session.create({
        data: {
            contestId: contest.id,
            userId: user.id,
            ip: sessionContext.ip,
            userAgent: sessionContext.userAgent,
            expiresAt
        }
    });

    await prisma.contestParticipant.update({
        where: { id: membership.id },
        data: { activeSessionId: session.id }
    });

    return {
        sessionId: session.id,
        slug,
        isPlatformAdmin: isPlatformAdmin || user.platformRole === "admin",
    };
};

const findSession = async (sessionId: string, contestId: string) => {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
            user: {
                include: {
                    participants: {
                        where: {
                            contestId,
                            deletedAt: null,
                            disqualifiedAt: null
                        },
                        include: { user: true },
                        take: 1
                    }
                }
            }
        }
    });

    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    let membership = session.user.participants[0] || null;

    // Super Admin auto-moderator provision for any contest
    if (!membership && session.user.platformRole === "admin") {
        membership = await prisma.contestParticipant.upsert({
            where: { contestId_userId: { contestId, userId: session.userId } },
            update: { role: "moderator", deletedAt: null, disqualifiedAt: null },
            create: { contestId, userId: session.userId, role: "moderator" },
            include: { user: true }
        });
    }

    return membership;
};

const getCurrentParticipant = async (contestId: string, participantId: string) => {
    const participant = await prisma.contestParticipant.findFirst({
        where: { id: participantId, contestId },
        select: {
            id: true,
            role: true,
            user: { select: { id: true, name: true, email: true } },
            submissions: {
                where: { contestId, status: { in: ["queued", "judging"] } },
                take: 1,
                select: { id: true }
            }
        }
    });

    if (!participant) throw new ApiError(401, "Session invalid or expired.");

    return {
        id: participant.user.id,
        participantId: participant.id,
        name: participant.user.name,
        email: participant.user.email,
        role: participant.role,
        pending: participant.submissions.length > 0
    };
};

export { handleLogin, findSession, getCurrentParticipant };
