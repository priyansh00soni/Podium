import { Request, Response } from "express";
import {
    createProblemWithTests,
    getProblemWithTests,
    updateProblemWithTests,
    getContestCandidates,
    addContestCandidates,
    removeContestCandidate
} from "./moderator.service.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";

function assertModerator(req: Request) {
    const membership = (req as any).membership;
    if (!membership || (membership.role !== "moderator" && membership.user?.platformRole !== "admin")) {
        throw new ApiError(403, "Staff privileges required for this contest.");
    }
    return membership;
}

export const createProblem = asyncHandler(async (req: Request, res: Response) => {
    const membership = assertModerator(req);
    const { number, title, statement, points, type = "coding", testCases, starterCode, driverCode } = req.body;

    if (typeof number !== "number" || number < 1 || number > 6) {
        throw new ApiError(400, "Problem number must be an integer between 1 and 6.");
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new ApiError(400, "At least one test case is required.");
    }

    if (!testCases.some((tc: any) => tc.isSample === false)) {
        throw new ApiError(400, "A problem must have at least one hidden test case.");
    }

    if (!starterCode || typeof starterCode !== "object") {
        throw new ApiError(400, "starterCode object is required for all supported languages.");
    }

    if (!driverCode || typeof driverCode !== "object") {
        throw new ApiError(400, "driverCode object is required for all supported languages.");
    }

    const problem = await createProblemWithTests(
        membership.contestId,
        { number, title, statement, points, type, starterCode, driverCode },
        testCases
    );

    return res.status(201).json({ success: true, data: problem });
});

export const getProblemDetail = asyncHandler(async (req: Request, res: Response) => {
    const membership = assertModerator(req);
    const problemId = String(req.params.id);
    const problem = await getProblemWithTests(membership.contestId, problemId);
    return res.status(200).json({ success: true, data: problem });
});

export const updateProblem = asyncHandler(async (req: Request, res: Response) => {
    const membership = assertModerator(req);
    const problemId = String(req.params.id);
    const { number, title, statement, points, type = "coding", testCases, starterCode, driverCode } = req.body;

    if (number !== undefined && (typeof number !== "number" || number < 1 || number > 6)) {
        throw new ApiError(400, "Problem number must be an integer between 1 and 6.");
    }

    if (testCases !== undefined) {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            throw new ApiError(400, "At least one test case is required.");
        }
        if (!testCases.some((tc: any) => tc.isSample === false)) {
            throw new ApiError(400, "A problem must have at least one hidden test case.");
        }
    }

    const updated = await updateProblemWithTests(
        membership.contestId,
        problemId,
        { number, title, statement, points, type, starterCode, driverCode },
        testCases
    );

    return res.status(200).json({ success: true, data: updated });
});

export const listCandidates = asyncHandler(async (req: Request, res: Response) => {
    const membership = assertModerator(req);
    const data = await getContestCandidates(membership.contestId);
    return res.status(200).json({ success: true, data });
});

export const addCandidates = asyncHandler(async (req: Request, res: Response) => {
    const membership = assertModerator(req);
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
        throw new ApiError(400, "Array of email addresses is required.");
    }

    const result = await addContestCandidates(membership.userId, membership.contestId, emails);
    return res.status(200).json({ success: true, data: result });
});

export const removeCandidate = asyncHandler(async (req: Request, res: Response) => {
    const membership = assertModerator(req);
    const email = String(req.params.email);

    if (!email) throw new ApiError(400, "Email parameter is required.");

    const result = await removeContestCandidate(membership.userId, membership.contestId, email);
    return res.status(200).json({ success: true, data: result });
});
