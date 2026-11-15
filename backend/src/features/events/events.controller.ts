import type { Request, Response } from "express";
import type { EventType } from "../../generated/prisma/enums.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { createIntegrityEvent } from "./events.service.js";

const integrityEventTypes: EventType[] = [
    "visibility_hidden", "fullscreen_exit", "paste_blocked",
    "permission_denied", "camera_stopped", "screenshare_stopped"
];

const createEventController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    const type = req.body?.type;
    if (typeof type !== "string" || !integrityEventTypes.includes(type as EventType)) {
        throw new ApiError(400, "Invalid integrity event type.");
    }

    const event = await createIntegrityEvent(membership, type as EventType);
    if (!event) {
        // Return 202 Accepted so the frontend doesn't show an error for background telemetry
        return res.status(202).json({ success: true, message: "Event logged" });
    }
    return res.status(201).json({ success: true, data: { id: event.id.toString() } });
});

export { createEventController };
