import type { EventType } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/db.js";
import { dbLogger } from "../../utils/logger.js"; 

type EventParticipant = { id: string; contestId: string; userId: string };

const createIntegrityEvent = async (participant: EventParticipant, eventType: EventType) => {
    try {
        // You MUST 'await' here so the catch block actually traps database errors
        return await prisma.event.create({
            data: {
                contestId: participant.contestId,
                participantId: participant.id,
                // Notice we specifically DO NOT include userId here per the schema constraint
                eventType
            },
            select: { id: true }
        });
    } catch (error) {
        // Log failures with the error name, never silently
        dbLogger.error(`Integrity Event Write Failed: ${error instanceof Error ? error.name : 'UnknownError'}`);
        return null; // Fail gracefully so the user's main request isn't interrupted
    }
};

export { createIntegrityEvent };