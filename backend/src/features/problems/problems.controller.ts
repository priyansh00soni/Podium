import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import {prisma} from "../../config/db.js";
import { getProblemsForContest } from "./problems.service.js";

const getProblemsController = asyncHandler(async (req: Request, res: Response) => {
    const slug = (req.params.slug as string)?.toLowerCase();

    // Reuse contest from middleware when available, avoiding redundant DB query
    const contest = req.contest || (await prisma.contest.findUnique({
        where: { slug }
    }));

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    const membership = req.membership;
    const isStaff = membership?.role === "moderator" || membership?.user?.platformRole === "admin";
    const problems = await getProblemsForContest(contest.id, contest.startsAt, contest.endsAt, isStaff);

    return res.status(200).json({
        success: true,
        message: "Problems fetched successfully.",
        data: problems
    });
});

export { getProblemsController };