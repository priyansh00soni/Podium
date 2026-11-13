import type { Request, Response } from "express";
import {  Language } from "../../generated/prisma/client.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { submitCode, getOwnSubmissions, getOwnSubmission } from "./submissions.service.js";
import {prisma} from "../../config/db.js";

const MAX_CODE_SIZE_BYTES = 64 * 1024; // 64 KB

const submitController = asyncHandler(async (req: Request, res: Response) => {
    const { problemId } = req.params;
    const { language, code } = req.body;
    const membership = (req as any).membership;
    const clickedAt = new Date();
    
    // Explicitly fetch the contest once
    const contest = await prisma.contest.findUnique({
        where: { id: membership.contestId }
    });

    if (!contest) {
        throw new ApiError(404, "Contest not found.");
    }

    if (!problemId) {
        throw new ApiError(400, "Problem ID is required.");
    }

    // Validate language dynamically against the Prisma schema enum
    if (!language || !Object.values(Language).includes(language as Language)) {
        throw new ApiError(400, "Invalid or unsupported programming language.");
    }

    // Validate code presence and size
    if (!code || typeof code !== "string" || code.trim().length === 0) {
        throw new ApiError(400, "Code cannot be empty.");
    }

    if (Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE_BYTES) {
        throw new ApiError(400, "Code payload exceeds the 64 KB limit.");
    }

    const submission = await submitCode(
        membership,
        problemId as string,
        language as Language,
        code,
        clickedAt,
        contest.startsAt,
        contest.endsAt
    );

    return res.status(201).json({
        success: true,
        message: "Submission received.",
        data: {
            id: submission.id,
            status: submission.status,
            verdict: submission.verdict ?? null,
            judgedAt: submission.judgedAt ?? null,
        }
    });
});

const getSubmissionsController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    const submissions = await getOwnSubmissions(membership.contestId, membership.id);
    return res.status(200).json({ success: true, data: submissions });
});

const getSubmissionController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    const submission = await getOwnSubmission(
        membership.contestId,
        membership.id,
        req.params.id as string
    );
    return res.status(200).json({ success: true, data: submission });
});

export { submitController, getSubmissionsController, getSubmissionController };
