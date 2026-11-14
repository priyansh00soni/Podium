import type { NextFunction, Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { prisma } from "../../config/db.js";
import { findSession, resolveContestParticipant } from "./auth.service.js";

const authMid = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const slug = (req.params.slug as string)?.toLowerCase();
    const sessionId = req.cookies.sessionId || req.cookies.sid_platform;

    if (!sessionId) {
        throw new ApiError(401, "Please sign in to continue.");
    }

    if (!slug) {
        const session = await findSession(sessionId);
        if (!session) throw new ApiError(401, "Session expired or invalid. Please sign in again.");
        req.user = session.user;
        return next();
    }

    // --- Consolidated 1-Query Fast Path ---
    // Look up session, user, and contest membership for this slug in ONE single database query
    const sessionWithParticipant = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
            user: {
                include: {
                    participants: {
                        where: {
                            contest: { slug }
                        },
                        include: {
                            contest: true,
                            user: true
                        }
                    }
                }
            }
        }
    });

    if (!sessionWithParticipant || sessionWithParticipant.expiresAt < new Date()) {
        throw new ApiError(401, "Session expired or invalid. Please sign in again.");
    }

    const user = sessionWithParticipant.user;
    const participant = user.participants[0];

    if (participant) {
        // 1. Instant Ban Check: Disqualified users are rejected immediately
        if (participant.disqualifiedAt) {
            throw new ApiError(403, "You have been disqualified from this contest.");
        }

        // 2. Instant Revocation Check: Deleted users are rejected immediately
        if (participant.deletedAt) {
            throw new ApiError(403, "Your participation in this contest has been revoked.");
        }

        // 3. Keep active session updated if changed
        if (participant.activeSessionId !== sessionId) {
            await prisma.contestParticipant.update({
                where: { id: participant.id },
                data: { activeSessionId: sessionId }
            });
            participant.activeSessionId = sessionId;
        }

        req.user = user;
        req.contest = participant.contest;
        req.membership = participant;
        return next();
    }

    // --- First-time visit path: resolve and enroll in contest ---
    const contest = await prisma.contest.findUnique({
        where: { slug }
    });

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    const membership = await resolveContestParticipant(user, contest, sessionId);

    req.user = user;
    req.contest = contest;
    req.membership = membership;

    next();
});

export default authMid;
