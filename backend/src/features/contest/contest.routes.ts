import { Router } from "express";
import requireSession from "../auth/auth.middleware.js";
import { getContestController } from "./contest.controller.js";

const router = Router();

router.get("/c/:slug", requireSession, getContestController);

export default router;
