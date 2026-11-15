import type { EventType } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/db.js";

type EventParticipant = { id: string; contestId: string; userId: string };

const createIntegrityEvent = async (participant: EventParticipant, eventType: EventType) => {
    return prisma.event.create({
        data: {
            contestId: participant.contestId,
            participantId: participant.id,
            eventType
        },
        select: { id: true }
    });
};

export { createIntegrityEvent };
