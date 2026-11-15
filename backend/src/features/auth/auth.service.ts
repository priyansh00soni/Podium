import { CALLBACK_URL, googleClient } from "../../config/google.js";
import { normalizeEmail } from "../../utils/normalize.js";
import ApiError from "../../utils/ApiError.js";
import { prisma } from "../../config/db.js";
import type { Contest, User } from "../../generated/prisma/client.js";

type SessionContext = {
    ip: string;
    userAgent: string;
};

const handleLogin = async (code: string, sessionContext: SessionContext) => {
    const { tokens } = await googleClient.getToken({ code, redirect_uri: CALLBACK_URL });
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token! });
    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified || !payload.email) {
        throw new ApiError(400, "Google account email is not verified.");
    }

    const email = normalizeEmail(payload.email);
    const name = payload.name ?? email;

    // Platform user creation or retrieval
    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name }
    });

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            ip: sessionContext.ip,
            userAgent: sessionContext.userAgent,
            expiresAt
        }
    });

    return {
        sessionId: session.id,
        user
    };
};

const findSession = async (sessionId: string) => {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
        return null;
    }

    return session;
};

const resolveContestParticipant = async (user: User, contest: Contest, sessionId: string) => {
    // 1. Check existing participant record
    let participant = await prisma.contestParticipant.findFirst({
        where: {
            contestId: contest.id,
            userId: user.id,
            deletedAt: null,
            disqualifiedAt: null
        },
        include: { user: true }
    });

    // 2. Super admin gets automatic moderator access to all contests
    if (user.platformRole === "admin") {
        participant = await prisma.contestParticipant.upsert({
            where: { contestId_userId: { contestId: contest.id, userId: user.id } },
            update: {
                role: "moderator",
                activeSessionId: sessionId,
                deletedAt: null,
                disqualifiedAt: null
            },
            create: {
                contestId: contest.id,
                userId: user.id,
                role: "moderator",
                activeSessionId: sessionId
            },
            include: { user: true }
        });
        return participant;
    }

    // 3. If already registered, update activeSessionId if it changed and return
    if (participant) {
        if (participant.activeSessionId !== sessionId) {
            await prisma.contestParticipant.update({
                where: { id: participant.id },
                data: { activeSessionId: sessionId }
            });
            participant.activeSessionId = sessionId;
        }
        return participant;
    }

    // 4. Model 2: Open Contest (any signed-in user automatically enrolled upon entering)
    if (contest.accessType === "open") {
        participant = await prisma.contestParticipant.upsert({
            where: { contestId_userId: { contestId: contest.id, userId: user.id } },
            update: {
                activeSessionId: sessionId
            },
            create: {
                contestId: contest.id,
                userId: user.id,
                role: "participant",
                activeSessionId: sessionId
            },
            include: { user: true }
        });
        return participant;
    }

    // 5. Model 1: Invite Only (enforces whitelist from allowed_emails)
    const allowed = await prisma.allowedEmail.findFirst({
        where: { contestId: contest.id, email: user.email }
    });

    if (!allowed) {
        throw new ApiError(403, "This is a private contest. You are not on the registration list.");
    }

    participant = await prisma.contestParticipant.upsert({
        where: { contestId_userId: { contestId: contest.id, userId: user.id } },
        update: {
            activeSessionId: sessionId
        },
        create: {
            contestId: contest.id,
            userId: user.id,
            role: "participant",
            activeSessionId: sessionId
        },
        include: { user: true }
    });

    return participant;
};

export { handleLogin, findSession, resolveContestParticipant };
