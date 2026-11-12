import { Router } from "express";
import { createProblem } from "./admin.controller.js";
import authMid from "../auth/auth.middleware.js";


const router = Router();
router.post("/c/:slug/admin/problems", authMid, createProblem);

export { router as adminRouter };