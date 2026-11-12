import { prisma } from "../../config/db.js";

interface ProblemData {
    number: string;
    title: string;
    statement: string;
    points: number;
    type: string;
}

interface TestCaseData {
    input: string;
    expectedOutput: string;
    isSample: boolean;
    position: number;
}

export const createProblemWithTests = async (
    contestId: string,
    problemData: ProblemData,
    testCases: TestCaseData[]
) => {
    // 1. Strict Validation: Must have at least one hidden test case
    const hasHiddenTest = testCases.some(tc => tc.isSample === false);
    if (!hasHiddenTest) {
        throw new Error("A problem must have at least one hidden test case (isSample: false).");
    }

    // 2. Transaction: Create problem and nested test cases simultaneously
    const problem = await prisma.problem.create({
        data: {
            ...problemData,
            contestId,
            status: "active", // Default status for new problems
            testCases: {
                create: testCases.map(tc => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput.trim(), // Trim trailing spaces for Judge0
                    isSample: tc.isSample,
                    position: tc.position
                }))
            }
        },
        // Only return what is necessary to confirm creation
        select: {
            id: true,
            title: true,
            testCases: {
                select: { id: true, isSample: true }
            }
        }
    });

    return problem;
};