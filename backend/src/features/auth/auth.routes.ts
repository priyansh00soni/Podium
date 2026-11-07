import { Router } from "express";
import { startLoginController, loginController } from "./auth.controller.js";

const router = Router();

router.get("/c/:slug/auth/google", startLoginController);
router.get("/auth/google/callback", loginController);

export default router;