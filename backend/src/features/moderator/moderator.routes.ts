import { Router } from "express";
import requireSession from "../auth/auth.middleware.js";
import {
    createProblem,
    getProblemDetail,
    updateProblem,
    listCandidates,
    addCandidates,
    removeCandidate
} from "./moderator.controller.js";

const router = Router();

// Problem Management
router.post("/c/:slug/moderator/problems", requireSession, createProblem);
router.get("/c/:slug/moderator/problems/:id", requireSession, getProblemDetail);
router.put("/c/:slug/moderator/problems/:id", requireSession, updateProblem);

// Candidate Whitelist Management (Invite-Only contests)
router.get("/c/:slug/moderator/candidates", requireSession, listCandidates);
router.post("/c/:slug/moderator/candidates", requireSession, addCandidates);
router.delete("/c/:slug/moderator/candidates/:email", requireSession, removeCandidate);

// Backward-compatible alias for existing contest admin route
router.post("/c/:slug/admin/problems", requireSession, createProblem);

export default router;
