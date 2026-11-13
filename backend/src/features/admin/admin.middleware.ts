import type { NextFunction, Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { prisma } from "../../config/db.js";

export const requireAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.cookies?.sessionId || req.cookies?.sid_platform;

    if (!sessionId) {
        throw new ApiError(401, "Administrator session missing. Please sign in.");
    }

    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
        throw new ApiError(401, "Administrator session expired or invalid. Please sign in again.");
    }

    if (session.user.platformRole !== "admin") {
        throw new ApiError(403, "Access denied: Platform administrator privileges required.");
    }

    req.adminUser = session.user;
    next();
});

