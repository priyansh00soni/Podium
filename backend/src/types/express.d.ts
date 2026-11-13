import type { prisma } from "../config/db.js";
import type { User } from "../generated/prisma/client.js";

type Membership = NonNullable<
    Awaited<ReturnType<typeof prisma.contestParticipant.findFirst>>
>;

declare global {
    namespace Express {
        interface Request {
            membership?: Membership;
            adminUser?: User;
        }
    }
}

export {};
