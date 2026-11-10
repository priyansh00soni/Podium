import { Router } from 'express';
import authMid from '../auth/auth.middleware.js';
import { fetchLeaderboard } from './leaderboard.controller.js';


const router = Router();

router.get('/c/:slug/leaderboard', authMid, fetchLeaderboard);

export { router as leaderboardRouter };