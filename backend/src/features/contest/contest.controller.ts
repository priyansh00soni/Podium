import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { getContestDetails } from "./contest.service.js";
import { getContestState } from "./contest.state.js";

const getContestController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    // Reuse contest from middleware when available, avoiding redundant DB query
    if (req.contest) {
        const serverNow = new Date();
        return res.status(200).json({
            success: true,
            data: {
                slug: req.contest.slug,
                title: req.contest.title,
                description: req.contest.description,
                startsAt: req.contest.startsAt,
                endsAt: req.contest.endsAt,
                leaderboardPublished: req.contest.leaderboardPublished,
                accessType: req.contest.accessType,
                state: getContestState(req.contest.startsAt, req.contest.endsAt, serverNow),
                serverNow
            }
        });
    }

    const contest = await getContestDetails(membership.contestId);
    return res.status(200).json({ success: true, data: contest });
});

export { getContestController };
