import { Router } from "express";
import requireSession from "../auth/auth.middleware.js";
import { createProblem } from "./moderator.controller.js";

const router = Router();

// Primary Moderator problem authoring route
router.post("/c/:slug/moderator/problems", requireSession, createProblem);

// Backward-compatible alias for existing contest admin route
router.post("/c/:slug/admin/problems", requireSession, createProblem);

export default router;

