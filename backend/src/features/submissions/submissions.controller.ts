import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { submitCode } from "./submissions.service.js";

const VALID_LANGUAGES = ["c", "cpp", "java", "javascript", "python"];
const MAX_CODE_SIZE_BYTES = 64 * 1024; // 64 KB

const submitController = asyncHandler(async (req: Request, res: Response) => {
    const { problemId } = req.params;
    const { language, code } = req.body;
    const membership = (req as any).membership; // Attached by requireSession middleware
    const clickedAt = new Date();

    // 1. Validate language
    if (!language || !VALID_LANGUAGES.includes(language)) {
        throw new ApiError(400, "Invalid or unsupported programming language.");
    }

    // 2. Validate code presence and size
    if (!code || typeof code !== "string" || code.trim().length === 0) {
        throw new ApiError(400, "Code cannot be empty.");
    }

    if (Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE_BYTES) {
        throw new ApiError(400, "Code payload exceeds the 64 KB limit.");
    }

    // 3. Process submission
    const submission = await submitCode(
        membership,
        problemId as string,
        language as any,
        code,
        clickedAt
    );

    return res.status(201).json({
        success: true,
        message: "Submission received.",
        data: {
            id: submission.id,
            status: submission.status
        }
    });
});

export { submitController };