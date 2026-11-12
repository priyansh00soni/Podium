import { Request, Response } from "express";
import { createProblemWithTests } from "./admin.service.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";


export const createProblem = asyncHandler(async (req: Request, res: Response) => {
    // 1. Extract params and middleware payload
    const membership = (req as any).membership;
    const { number, title, statement, points, type = "coding", testCases } = req.body;

    // 2. Strict Role Check: Must be a moderator
    // (If platform admin is allowed, ensure requireSession handles that logic)
    if (membership.role !== "moderator") {
        throw new ApiError(403, "Only staff can create problems for this contest.");
    }

    // 3. Validation: Data Types
    if (typeof number !== 'number' || number < 1 || number > 6) {
        throw new ApiError(400, "Problem number must be an integer between 1 and 6.");
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new ApiError(400, "At least one test case is required.");
    }

    // 4. Validation: Business Logic
    if (!testCases.some((tc: any) => tc.isSample === false)) {
        throw new ApiError(400, "A problem must have at least one hidden test case.");
    }

    // 5. Execute Service (Using the contestId already verified by middleware)
    const problem = await createProblemWithTests(membership.contestId, { 
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
});