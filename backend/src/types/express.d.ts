import type { prisma } from "../config/db.js";

type Membership = NonNullable<
    Awaited<ReturnType<typeof prisma.contestParticipant.findFirst>>
>;

declare global {
    namespace Express {
        interface Request {
            membership?: Membership;
        }
    }
}

export {};
