import { Router } from "express";
import {
    startLoginController,
    startAdminLoginController,
    loginController,
    getMeController,
    getPlatformMeController
} from "./auth.controller.js";
import requireSession from "./auth.middleware.js";

const router = Router();

router.get("/c/:slug/auth/google", startLoginController);
router.get("/auth/google/admin", startAdminLoginController);
router.get("/login", loginController);
router.get("/c/:slug/me", requireSession, getMeController);
router.get("/me", getPlatformMeController);

export default router;
