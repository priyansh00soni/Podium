import type { Contest, ContestParticipant, User } from "../generated/prisma/client.js";

export type Membership = ContestParticipant & {
    user: User;
};

declare global {
    namespace Express {
        interface Request {
            membership?: Membership;
            contest?: Contest;
            adminUser?: User;
        }
    }
}

export {};
