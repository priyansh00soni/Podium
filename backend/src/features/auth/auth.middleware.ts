import type { NextFunction, Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";

import { findSession } from "./auth.service.js";
import ApiError from "../../utils/ApiError.js";
import { prisma } from "../../config/db.js";

const authMid = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.cookies.sessionId;
    const slug = req.params.slug as string;

    if (!sessionId) throw new ApiError(401, "Session cookie missing.");

    const contest = await prisma.contest.findUnique({
        where: { slug }
    });

    if (!contest) throw new ApiError(404, "Contest not found.");

    const membership = await findSession(sessionId, contest.id);

    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    req.membership = membership;
    
    next();
});

export default authMid;