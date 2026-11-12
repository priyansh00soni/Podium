import { Request, Response } from "express";
import { prisma } from "../../config/db.js";
import { createProblemWithTests } from "./admin.service.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";


export const createProblem = asyncHandler(async (req: Request, res: Response) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : (req.params.slug as string);
    const { number, title, statement, points, type, testCases } = req.body;
    
    // Assuming requireSession attaches the authenticated user's ID here
    const userId = req.user!.id; 

    // 1. Validate input exists
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
        throw new ApiError(400, "Test cases array is required.");
    }

    // 2. Fetch the contest
    const contest = await prisma.contest.findUnique({
        where: { slug }
    });

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    // 3. Role Check: Fetch the user's participation record for this specific contest
    const membership = await prisma.participant.findFirst({
        where: { 
            contestId: contest.id, 
            userId: userId 
        }
    });

    // Enforce staff-only access
    if (!membership || (membership.role !== "admin" && membership.role !== "moderator")) {
        throw new ApiError(403, "Only staff can create problems for this contest.");
    }

    // 4. Execute Service
    try {
        const problem = await createProblemWithTests(contest.id, {
            number,
            title,
            statement,
            points,
            type
        }, testCases);

        return res.status(201).json({
            success: true,
            data: problem
        });
    } catch (error: any) {
        // Catch the "no hidden test case" error from the service and return it cleanly
        throw new ApiError(400, error.message);
    }
});