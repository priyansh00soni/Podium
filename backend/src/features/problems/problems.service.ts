import {prisma} from "../../config/db.js";
import { getContestState } from "../contest/contest.state.js";

const getProblemsForContest = async (contestId: string, startsAt: Date, endsAt: Date) => {
    const state = getContestState(startsAt, endsAt);

    // If the contest hasn't started, return an empty array to prevent leaking problems
    if (state === "before") {
        return [];
    }

    // Fetch problems mapped exactly to the schema properties
    const problems = await prisma.problem.findMany({
        where: { 
            contestId: contestId,
            status: "active" 
        },
        orderBy: {
            number: "asc" 
        },
        select: {
            id: true,
            number: true,
            title: true,
            statement: true,
            points: true,
            type: true,
            testCases: {
                where: { isSample: true },
                orderBy: { position: "asc" },
                select: {
                    id: true,
                    input: true,
                    expectedOutput: true
                }
            }
        }
    });

    return problems;
};

export { getProblemsForContest };