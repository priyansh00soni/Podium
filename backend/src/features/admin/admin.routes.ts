import { Router } from "express";
import { requireAdmin } from "./admin.middleware.js";
import {
    listContestsController,
    getContestDetailController,
    createContestController,
    updateContestController,
    addAllowedEmailsController,
    removeAllowedEmailController,
    assignModeratorController,
    removeModeratorController,
    getStatsController
} from "./admin.controller.js";

const router = Router();

// All routes in this router require platform admin privileges
router.use(requireAdmin);

router.get("/contests", listContestsController);
router.post("/contests", createContestController);
router.get("/contests/:id", getContestDetailController);
router.patch("/contests/:id", updateContestController);

router.post("/contests/:id/allowed-emails", addAllowedEmailsController);
router.delete("/contests/:id/allowed-emails/:email", removeAllowedEmailController);

router.post("/contests/:id/moderators", assignModeratorController);
router.delete("/contests/:id/moderators/:userId", removeModeratorController);

router.get("/stats", getStatsController);

export default router;

