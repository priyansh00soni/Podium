import type { Request, Response } from "express";
import {  Language } from "../../generated/prisma/client.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { submitCode } from "./submissions.service.js";
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
            verdict: submission.verdict
        }
    });
});

export { submitController };