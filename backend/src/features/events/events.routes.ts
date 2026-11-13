import { Router } from "express";
import requireSession from "../auth/auth.middleware.js";
import { createEventController } from "./events.controller.js";

const router = Router();

router.post("/c/:slug/events", requireSession, createEventController);

export default router;
