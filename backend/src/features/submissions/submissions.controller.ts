import type { Request, Response } from "express";
import {  Language } from "../../generated/prisma/client.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { submitCode, getOwnSubmissions, getOwnSubmission } from "./submissions.service.js";
import {prisma} from "../../config/db.js";
import { runSampleTestsDetailed } from "../judge/judge.js";
import { getLanguageLimits } from "../judge/judge.limits.js";

const MAX_CODE_SIZE_BYTES = 64 * 1024; // 64 KB

const submitController = asyncHandler(async (req: Request, res: Response) => {
    const problemId = String(req.params.problemId);
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

const runCodeController = asyncHandler(async (req: Request, res: Response) => {
    const problemId = String(req.params.problemId);
    const { language, code, customInput } = req.body;
    const membership = (req as any).membership;

    if (!problemId) {
        throw new ApiError(400, "Problem ID is required.");
    }

    if (!language || !Object.values(Language).includes(language as Language)) {
        throw new ApiError(400, "Invalid or unsupported programming language.");
    }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
        throw new ApiError(400, "Code cannot be empty.");
    }

    if (Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE_BYTES) {
        throw new ApiError(400, "Code payload exceeds the 64 KB limit.");
    }

    // Fetch sample test cases for this problem
    let tests: { input: string; expectedOutput: string }[] = [];

    if (customInput !== undefined && typeof customInput === "string") {
        tests = [{ input: customInput, expectedOutput: "" }];
    } else {
        const sampleCases = await prisma.testCase.findMany({
            where: { problemId, isSample: true },
            orderBy: { position: "asc" },
            select: { input: true, expectedOutput: true }
        });

        if (sampleCases && sampleCases.length > 0) {
            tests = sampleCases;
        } else {
            // Fallback to first available test case if none marked sample
            const firstCase = await prisma.testCase.findFirst({
                where: { problemId },
                orderBy: { position: "asc" },
                select: { input: true, expectedOutput: true }
            });
            if (firstCase) tests = [firstCase];
        }
    }

    if (tests.length === 0) {
        throw new ApiError(400, "No sample test cases available to run.");
    }

    // Check if problem has a driver harness for this language
    const problem = await prisma.problem.findUnique({
        where: { id: problemId },
        select: { driverCode: true }
    });

    const driverCodeMap = (problem?.driverCode as Record<string, string>) || {};
    const driver = driverCodeMap[language];
    const codeToExecute = driver && typeof driver === "string" && driver.trim().length > 0
        ? `${code}\n\n// --- HIDDEN DRIVER HARNESS ---\n${driver}`
        : code;

    const limits = getLanguageLimits(language as Language);
    const result = await runSampleTestsDetailed(codeToExecute, language as Language, tests, limits);

    return res.status(200).json({
        success: true,
        message: "Code executed successfully against test cases.",
        data: result
    });
});

export { submitController, getSubmissionsController, getSubmissionController, runCodeController };
