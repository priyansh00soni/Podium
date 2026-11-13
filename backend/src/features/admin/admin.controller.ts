import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import {
    listAllContests,
    getAdminContestDetail,
    createContest,
    updateContest,
    assignModerator,
    removeModerator,
    getPlatformStats
} from "./admin.service.js";

export const listContestsController = asyncHandler(async (req: Request, res: Response) => {
    const contests = await listAllContests();
    return res.status(200).json({ success: true, data: contests });
});

export const getContestDetailController = asyncHandler(async (req: Request, res: Response) => {
    const contestId = String(req.params.id);
    const detail = await getAdminContestDetail(contestId);
    return res.status(200).json({ success: true, data: detail });
});

export const createContestController = asyncHandler(async (req: Request, res: Response) => {
    const adminUser = req.adminUser!;
    const { slug, title, description, startsAt, endsAt, leaderboardPublished, accessType } = req.body;

    if (!slug || !title || !startsAt || !endsAt) {
        throw new ApiError(400, "Missing required fields: slug, title, startsAt, endsAt are required.");
    }

    const contest = await createContest(adminUser.id, {
        slug,
        title,
        description,
        startsAt,
        endsAt,
        leaderboardPublished,
        accessType,
    });

    return res.status(201).json({ success: true, data: contest });
});

export const updateContestController = asyncHandler(async (req: Request, res: Response) => {
    const adminUser = req.adminUser!;
    const contestId = String(req.params.id);
    const { title, description, startsAt, endsAt, leaderboardPublished, accessType } = req.body;

    const contest = await updateContest(adminUser.id, contestId, {
        title,
        description,
        startsAt,
        endsAt,
        leaderboardPublished,
        accessType,
    });

    return res.status(200).json({ success: true, data: contest });
});

export const assignModeratorController = asyncHandler(async (req: Request, res: Response) => {
    const adminUser = req.adminUser!;
    const contestId = String(req.params.id);
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        throw new ApiError(400, "Valid email string is required.");
    }

    const result = await assignModerator(adminUser.id, contestId, email);
    return res.status(200).json({ success: true, data: result });
});

export const removeModeratorController = asyncHandler(async (req: Request, res: Response) => {
    const adminUser = req.adminUser!;
    const contestId = String(req.params.id);
    const userId = String(req.params.userId);

    if (!userId) throw new ApiError(400, "User ID parameter is required.");

    const result = await removeModerator(adminUser.id, contestId, userId);
    return res.status(200).json({ success: true, data: result });
});

export const getStatsController = asyncHandler(async (req: Request, res: Response) => {
    const stats = await getPlatformStats();
    return res.status(200).json({ success: true, data: stats });
});
