import { Request, Response } from 'express';
import { prisma } from '../../config/db.js';
import ApiError from '../../utils/ApiError.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { getLeaderboard } from './leaderboard.service.js';

export const fetchLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug as string;
  
  // 1. Look up the contest
  const contest = await prisma.contest.findUnique({
    where: { slug }
  });

  if (!contest) {
    throw new ApiError(404, 'Contest not found');
  }

  // 2. Fetch aggregated board
  const board = await getLeaderboard(contest.id);

  // 3. Return JSON with published flag
  return res.json({
    success: true,
    data: board,
    published: contest.leaderboardPublished
  });
});