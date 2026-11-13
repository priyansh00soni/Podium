import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { getContestDetails } from "./contest.service.js";

const getContestController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    const contest = await getContestDetails(membership.contestId);
    return res.status(200).json({ success: true, data: contest });
});

export { getContestController };
