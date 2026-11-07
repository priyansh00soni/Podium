import { Router } from "express";
import { submitController } from "./submissions.controller.js";
import requireSession from "../auth/auth.middleware.js";

const router = Router();

// Protected by requireSession to ensure only logged-in participants can submit
router.post("/c/:slug/problems/:problemId/submit", requireSession, submitController);

export default router;