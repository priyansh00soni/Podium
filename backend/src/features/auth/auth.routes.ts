import { Router } from "express";
import {
    startLoginController,
    startAdminLoginController,
    loginController,
    getMeController,
    getPlatformMeController,
    logoutController
} from "./auth.controller.js";
import requireSession from "./auth.middleware.js";

const router = Router();

// Unified Google sign-in (supports ?returnTo=...)
router.get("/auth/google", startLoginController);
router.get("/auth/google/admin", startAdminLoginController);
router.get("/c/:slug/auth/google", startLoginController);
router.get("/login", loginController);
router.post("/logout", logoutController);
router.post("/c/:slug/auth/logout", logoutController);

// Profile inspection
router.get("/me", getPlatformMeController);
router.get("/c/:slug/me", requireSession, getMeController);

export default router;
