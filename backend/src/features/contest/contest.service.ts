import { prisma } from "../../config/db.js";
import ApiError from "../../utils/ApiError.js";
import { getContestState } from "./contest.state.js";

const getContestDetails = async (contestId: string) => {
    const contest = await prisma.contest.findUnique({
        where: { id: contestId },
        select: {
            slug: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            leaderboardPublished: true,
            accessType: true
        }
    });

    if (!contest) throw new ApiError(404, "Contest not found.");

    const serverNow = new Date();
    return {
        ...contest,
        state: getContestState(contest.startsAt, contest.endsAt, serverNow),
        serverNow
    };
};

export { getContestDetails };
