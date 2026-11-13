import { Router } from "express";
import { submitController, getSubmissionsController, getSubmissionController } from "./submissions.controller.js";
import requireSession from "../auth/auth.middleware.js";

const router = Router();

// Protected by requireSession to ensure only logged-in participants can submit
router.post("/c/:slug/problems/:problemId/submit", requireSession, submitController);
router.get("/c/:slug/submissions", requireSession, getSubmissionsController);
router.get("/c/:slug/submissions/:id", requireSession, getSubmissionController);

export default router;
