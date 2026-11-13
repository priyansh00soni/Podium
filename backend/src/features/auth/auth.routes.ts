import { Router } from "express";
import { startLoginController, loginController, getMeController } from "./auth.controller.js";
import requireSession from "./auth.middleware.js";

const router = Router();

router.get("/c/:slug/auth/google", startLoginController);
router.get("/login", loginController);
router.get("/c/:slug/me", requireSession, getMeController);

export default router;
