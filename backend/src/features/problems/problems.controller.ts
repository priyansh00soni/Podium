import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import {prisma} from "../../config/db.js";
import { getProblemsForContest } from "./problems.service.js";

const getProblemsController = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug as string;

    // We fetch the contest here to get the startsAt and endsAt times for the state check.

    const contest = await prisma.contest.findUnique({
        where: { slug: slug.toLowerCase() }
    });

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    const problems = await getProblemsForContest(contest.id, contest.startsAt, contest.endsAt);

    return res.status(200).json({
        success: true,
        message: "Problems fetched successfully.",
        data: problems
    });
});

export { getProblemsController };