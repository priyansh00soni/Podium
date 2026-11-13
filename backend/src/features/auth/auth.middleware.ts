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

    const session = await findSession(sessionId);
    if (!session) {
        throw new ApiError(401, "Session expired or invalid. Please sign in again.");
    }

    const contest = await prisma.contest.findUnique({
        where: { slug }
    });

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    const membership = await resolveContestParticipant(session.user, contest, sessionId);

    req.user = session.user;
    req.contest = contest;
    req.membership = membership;

    next();
});

export default authMid;
