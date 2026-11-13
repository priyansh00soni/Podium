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

    const contest = await prisma.contest.findUnique({
        where: { slug }
    });
    if (!contest) throw new ApiError(404, "Contest not found.");

    const allowed = await prisma.allowedEmail.findFirst({
        where: { contestId: contest.id, email }
    });
    if (!allowed) throw new ApiError(403, "You are not on the registration list for this contest.");

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {  email, name: allowed.name ?? payload.name ?? email  }
    });

    const membership = await prisma.contestParticipant.upsert({
        where: { contestId_userId: { contestId: contest.id, userId: user.id } },
        update: {},
        create: { contestId: contest.id, userId: user.id, role: "participant" }
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

    return session.id;
};

const findSession = async (sessionId: string, contestId: string) => {
    const session = await prisma.session.findUnique({
        where: { id: sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    const membership = await prisma.contestParticipant.findFirst({
        where: {
            activeSessionId: sessionId,
            contestId: contestId,
            deletedAt: null,
            disqualifiedAt: null
        }
    });

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
