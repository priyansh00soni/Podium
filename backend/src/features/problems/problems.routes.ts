import { Router } from "express";
import { getProblemsController } from "./problems.controller.js";
import authMid from "../auth/auth.middleware.js";

const router = Router();

// Protected by authMid to ensure only logged-in, registered participants can view
router.get("/c/:slug/problems", authMid, getProblemsController);

export default router;